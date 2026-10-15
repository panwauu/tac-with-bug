-- Run with psql, not inside a transaction block. The whole file can be run again safely.
\set ON_ERROR_STOP on

-- CREATE OR REPLACE TRIGGER (below) needs PostgreSQL 14 or newer: stop before anything is changed
DO $$
BEGIN
  IF current_setting('server_version_num')::int < 140000 THEN
    RAISE EXCEPTION 'changes.sql needs PostgreSQL 14 or newer';
  END IF;
END
$$;

-- Indexes for the running games (list of running games, games summary, jobs for idle games) and for the games with an
-- open rematch (job every 5 seconds). CONCURRENTLY: games stay writable while they are built. An index left invalid by
-- an interrupted build is dropped first, so that it is built again.
SELECT format('DROP INDEX CONCURRENTLY %I', c.relname) FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
WHERE c.relname IN ('games_running_idx', 'games_rematch_open_idx') AND NOT i.indisvalid \gexec
CREATE INDEX CONCURRENTLY IF NOT EXISTS games_running_idx ON games (id) WHERE running;
CREATE INDEX CONCURRENTLY IF NOT EXISTS games_rematch_open_idx ON games (lastplayed) WHERE rematch_open;

-- Leaderboards: one short row per finished game (game_results), written by a trigger on games.
-- The leaderboard queries read only this table (and users_to_games/users for the names), never the game JSON.
--
-- A row exists exactly for the games the leaderboards count: running = FALSE and "gameEnded" is JSON true.
-- The three functions read the stored JSON like the previous queries did, and never throw, whatever it looks like:
--   coop           JSON true/false as stored; NULL if missing or not a boolean (such games are on no leaderboard)
--   winning_seats  the seats (player_index) in a team whose "winningTeams" entry is JSON true; teams 0, 1 and 2
--   cards          for team games: the sum of statistic[*].cards.total[0], each rounded like a cast to integer

CREATE OR REPLACE FUNCTION game_result_coop(game jsonb) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE jsonb_typeof(game -> 'coop') WHEN 'boolean' THEN (game -> 'coop')::boolean END
$$;

CREATE OR REPLACE FUNCTION game_result_winning_seats(game jsonb) RETURNS INT [] LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(DISTINCT seat ORDER BY seat), '{}')
  FROM (
    -- nested CASE: the number check comes first, so that no cast can fail
    SELECT CASE WHEN jsonb_typeof(member.value) = 'number' THEN
        CASE WHEN (member.value #>> '{}')::numeric BETWEEN 0 AND 1000 AND (member.value #>> '{}')::numeric = trunc((member.value #>> '{}')::numeric)
          THEN (member.value #>> '{}')::numeric::int END
      END AS seat
    FROM generate_series(0, 2) AS team(nr)
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN game -> 'winningTeams' -> team.nr = 'true'::jsonb AND jsonb_typeof(game -> 'teams' -> team.nr) = 'array'
          THEN game -> 'teams' -> team.nr ELSE '[]'::jsonb END
      ) AS member
  ) AS seats
  WHERE seat IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION game_result_cards(game jsonb) RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN total BETWEEN -2147483648 AND 2147483647 THEN total::int END
  FROM (
    SELECT SUM(CASE WHEN jsonb_typeof(entry.value #> '{cards,total,0}') = 'number'
                 THEN round((entry.value #>> '{cards,total,0}')::numeric) END) AS total
    FROM jsonb_array_elements(CASE jsonb_typeof(game -> 'statistic') WHEN 'array' THEN game -> 'statistic' ELSE '[]'::jsonb END) AS entry
  ) AS sum
$$;

CREATE TABLE IF NOT EXISTS game_results (
  -- The foreign key on games (id) ON DELETE CASCADE is added after the fill, see below
  gameid INT PRIMARY KEY,
  created timestamptz NOT NULL,
  lastplayed timestamptz NOT NULL,
  n_players INT NOT NULL,
  coop BOOLEAN,
  winning_seats INT [] NOT NULL,
  cards INT
);

CREATE INDEX IF NOT EXISTS game_results_competitive_idx ON game_results (created) WHERE coop = FALSE;
CREATE INDEX IF NOT EXISTS game_results_coop_idx ON game_results (n_players, created) WHERE coop = TRUE;

CREATE OR REPLACE FUNCTION game_results_sync() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    IF NOT NEW.running AND NEW.game -> 'gameEnded' = 'true'::jsonb THEN
      INSERT INTO game_results (gameid, created, lastplayed, n_players, coop, winning_seats, cards)
      VALUES (NEW.id, NEW.created, NEW.lastplayed, NEW.n_players, game_result_coop(NEW.game), game_result_winning_seats(NEW.game), game_result_cards(NEW.game))
      ON CONFLICT (gameid) DO UPDATE SET created = EXCLUDED.created, lastplayed = EXCLUDED.lastplayed, n_players = EXCLUDED.n_players,
        coop = EXCLUDED.coop, winning_seats = EXCLUDED.winning_seats, cards = EXCLUDED.cards;
    ELSIF TG_OP = 'UPDATE' THEN
      DELETE FROM game_results WHERE gameid = NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- A game must never fail to save because of the leaderboards
    RAISE WARNING 'game_results: game % not recorded: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END
$$;

-- Only for finished games, and on updates only when a column the result is made of is set (not for rematch_open,
-- bots or colors): moves of a running game and the rematch job do not run it.
CREATE OR REPLACE TRIGGER game_results_insert AFTER INSERT ON games FOR EACH ROW WHEN (NOT NEW.running) EXECUTE FUNCTION game_results_sync();
CREATE OR REPLACE TRIGGER game_results_update AFTER UPDATE OF running, game, created, lastplayed, n_players ON games FOR EACH ROW WHEN (NOT NEW.running OR NOT OLD.running) EXECUTE FUNCTION game_results_sync();

-- Fill once from the games that ended before the trigger existed: steps of 10,000 game ids with a commit after each,
-- so that no transaction runs long. Games that end meanwhile are written by the trigger; ON CONFLICT skips them here.
-- Reads every game once (about a minute for 560,000 games on a 2-core test machine); games stay writable.
DO $$
DECLARE
  step_start INT := 0;
  last_id INT;
BEGIN
  SELECT COALESCE(max(id), 0) INTO last_id FROM games;
  WHILE step_start <= last_id LOOP
    INSERT INTO game_results (gameid, created, lastplayed, n_players, coop, winning_seats, cards)
    SELECT id, created, lastplayed, n_players, game_result_coop(game), game_result_winning_seats(game), game_result_cards(game)
    FROM games
    WHERE id >= step_start AND id < step_start + 10000 AND NOT running AND game -> 'gameEnded' = 'true'::jsonb
    ON CONFLICT (gameid) DO NOTHING;
    COMMIT;
    step_start := step_start + 10000;
  END LOOP;
END
$$;

-- Now the foreign key. Checking it while filling would have locked every row of games. It is added without checking
-- the existing rows (a short lock); from then on deleting a game deletes its row here. Then rows of games deleted during
-- the fill are removed, and the existing rows are checked without locking games.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_results_gameid_fkey' AND conrelid = 'game_results'::regclass) THEN
    ALTER TABLE game_results ADD CONSTRAINT game_results_gameid_fkey FOREIGN KEY (gameid) REFERENCES games (id) ON DELETE CASCADE NOT VALID;
  END IF;
END
$$;
DELETE FROM game_results WHERE NOT EXISTS (SELECT 1 FROM games WHERE games.id = game_results.gameid);
ALTER TABLE game_results VALIDATE CONSTRAINT game_results_gameid_fkey;
ANALYZE game_results;

-- Check, expected: t | t | t
SELECT
  (SELECT count(*) FROM game_results) = (SELECT count(*) FROM games WHERE NOT running AND game -> 'gameEnded' = 'true'::jsonb) AS all_games_recorded,
  (SELECT bool_and(indisvalid) FROM pg_index WHERE indexrelid IN ('games_running_idx'::regclass, 'games_rematch_open_idx'::regclass)) AS indexes_valid,
  (SELECT convalidated FROM pg_constraint WHERE conname = 'game_results_gameid_fkey') AS foreign_key_valid;
