CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username varchar(20) UNIQUE,
  email varchar(255) UNIQUE,
  password varchar(255) NOT NULL,
  registered timestamptz NOT NULL DEFAULT current_timestamp,
  lastlogin timestamptz NOT NULL DEFAULT current_timestamp,
  activated boolean NOT NULL DEFAULT false,
  token varchar(50) NOT NULL,
  profilepic bytea,
  currentsubscription int,
  locale VARCHAR(2) NOT NULL DEFAULT 'de',
  color_blindness_flag BOOLEAN NOT NULL DEFAULT false,
  prefers_dark_mode BOOLEAN DEFAULT NULL,
  admin BOOLEAN NOT NULL DEFAULT FALSE,
  game_default_position INTEGER [2] NOT NULL DEFAULT '{1, 0}',
  user_description VARCHAR(200) NOT NULL DEFAULT '',
  notification_settings BOOLEAN [] NOT NULL DEFAULT array_fill(TRUE, ARRAY [6]) CHECK (array_length(notification_settings, 1) = 6),
  -- Account of an external bot that logs in like a user: its games are not on the leaderboards (set by hand, login is not affected)
  bot_account BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE password_reset_requests (
  token CHAR(64) NOT NULL PRIMARY KEY,
  userid INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  time_of_request timestamptz NOT NULL DEFAULT current_timestamp,
  valid BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  userid int NOT NULL REFERENCES users (id),
  subscriptionid varchar(40) NOT NULL UNIQUE,
  status varchar(20) NOT NULL CHECK(
    status = 'running'
    OR status = 'cancelled'
    OR status = 'expiring'
  ),
  validuntil timestamptz NOT NULL
);

ALTER TABLE
  users
ADD
  FOREIGN KEY (currentsubscription) REFERENCES subscriptions(id);

CREATE TABLE friendships(
  userid1 int NOT NULL REFERENCES users (id),
  userid2 int NOT NULL REFERENCES users (id) CHECK(userid1 < userid2),
  pending_user int REFERENCES users (id) CHECK(
    pending_user = userid1
    OR pending_user = userid2
  ),
  PRIMARY KEY (userid1, userid2),
  date timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE tournaments (
  id SERIAL PRIMARY KEY,
  title varchar(50) NOT NULL,
  status varchar(25) NOT NULL CHECK(
    status = 'signUpWaiting'
    OR status = 'signUp'
    OR status = 'signUpEnded'
    OR status = 'signUpFailed'
    OR status = 'running'
    OR status = 'ended'
  ),
  signup_begin timestamptz NOT NULL,
  signup_deadline timestamptz NOT NULL CHECK(signup_begin < signup_deadline),
  creation_dates timestamptz [] NOT NULL,
  creation_phase INTEGER NOT NULL DEFAULT 1,
  time_per_game interval NOT NULL,
  n_teams INTEGER NOT NULL,
  players_per_team INTEGER NOT NULL CHECK(
    players_per_team = 2
    OR players_per_team = 3
  ) DEFAULT 2,
  teams_per_match INTEGER NOT NULL CHECK(
    teams_per_match = 2
    OR teams_per_match = 3
  ) DEFAULT 2,
  tournament_type varchar(50) NOT NULL CHECK(tournament_type = 'KO') DEFAULT 'KO',
  data JSON
);

CREATE TABLE users_to_tournaments (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES tournaments (id),
  UNIQUE (userid, tournamentid),
  team_number INTEGER NOT NULL,
  team_name varchar(50) NOT NULL
);

CREATE type users_to_tournaments_type AS (
  userid INT,
  tournamentid INT,
  team_number INT,
  team_name varchar(50)
);

CREATE TABLE tournaments_register (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES tournaments (id),
  team_name varchar(50) NOT NULL,
  activated Boolean DEFAULT(false)
);

CREATE TABLE private_tournaments (
  id SERIAL PRIMARY KEY,
  title varchar(50) NOT NULL,
  status varchar(25) NOT NULL CHECK(
    (
      status = ANY(ARRAY ['planned', 'running', 'ended', 'aborted'])
    )
  ) DEFAULT 'planned',
  admin_player INTEGER NOT NULL REFERENCES users (id),
  n_teams INTEGER NOT NULL,
  players_per_team INTEGER NOT NULL CHECK(players_per_team IN (2, 3)) DEFAULT 2,
  teams_per_match INTEGER NOT NULL CHECK(teams_per_match IN (2, 3)) DEFAULT 2,
  tournament_type varchar(50) NOT NULL CHECK(tournament_type = 'KO') DEFAULT 'KO',
  created timestamptz NOT NULL DEFAULT current_timestamp,
  data JSON
);

CREATE TABLE users_to_private_tournaments (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES private_tournaments (id),
  UNIQUE (userid, tournamentid),
  team_number INTEGER NOT NULL,
  team_name varchar(50) NOT NULL
);

CREATE TABLE private_tournaments_register (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES private_tournaments (id),
  UNIQUE (userid, tournamentid),
  team_name varchar(50) NOT NULL,
  activated Boolean DEFAULT(false)
);

CREATE SEQUENCE game_id_seq;

CREATE TABLE games (
  id INT PRIMARY KEY DEFAULT nextval('game_id_seq'),
  running BOOLEAN NOT NULL DEFAULT TRUE,
  n_players int NOT NULL CHECK (
    n_players = 4
    OR n_players = 6
  ),
  n_teams int NOT NULL CHECK(
    n_teams = 2
    OR (
      n_teams = 3
      AND n_players = 6
    )
  ),
  created timestamptz NOT NULL DEFAULT current_timestamp,
  lastPlayed timestamptz NOT NULL DEFAULT current_timestamp,
  -- A game with a bot of Tac-With-Bug is never a tournament game. The entries beyond the seats are the bots that
  -- were replaced during the game: a replaced bot keeps the index of its archived statistic, so that a finished
  -- game still shows that a bot played it (see substitution.ts and the leaderboards in leaders.ts).
  bots INT ARRAY NOT NULL DEFAULT '{NULL,NULL,NULL,NULL,NULL,NULL}' CONSTRAINT games_bots_check CHECK (
    cardinality(array_remove(bots, NULL)) = 0
    OR (
      public_tournament_id IS NULL
      AND private_tournament_id IS NULL
    )
  ),
  game jsonb NOT NULL,
  public_tournament_id INT REFERENCES tournaments(id),
  private_tournament_id INT REFERENCES private_tournaments(id),
  CONSTRAINT only_one_tournament CHECK(
    public_tournament_id IS NULL
    OR private_tournament_id IS NULL
  ),
  rematch_open BOOLEAN NOT NULL DEFAULT FALSE,
  colors json
);

-- The running games are few. The list of running games, the games summary and the jobs for idle games find them with
-- this index instead of reading every game.
CREATE INDEX games_running_idx ON games (id) WHERE running;

-- The few games with an open rematch, for the job that closes them every 5 seconds
CREATE INDEX games_rematch_open_idx ON games (lastplayed) WHERE rematch_open;

CREATE TABLE users_to_games (
  id SERIAL PRIMARY KEY,
  userid INT NOT NULL REFERENCES users(id),
  gameid INT NOT NULL REFERENCES games(id),
  player_index INT NOT NULL CHECK (player_index >= 0),
  CONSTRAINT unique_game_user_combination UNIQUE(userid, gameid),
  CONSTRAINT unique_game_player_index_combination UNIQUE(gameid, player_index)
);

-- Leaderboards: one short row per finished game (game_results), written by a trigger on games.
-- The leaderboard queries read only this table (and users_to_games/users for the names), never the game JSON.
--
-- A row exists exactly for the games the leaderboards count: running = FALSE and "gameEnded" is JSON true.
-- The three functions read the stored JSON like the previous queries did, and never throw, whatever it looks like:
--   coop           JSON true/false as stored; NULL if missing or not a boolean (such games are on no leaderboard)
--   winning_seats  the seats (player_index) in a team whose "winningTeams" entry is JSON true; teams 0, 1 and 2
--   cards          for team games: the sum of statistic[*].cards.total[0], each rounded like a cast to integer

CREATE FUNCTION game_result_coop(game jsonb) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE jsonb_typeof(game -> 'coop') WHEN 'boolean' THEN (game -> 'coop')::boolean END
$$;

CREATE FUNCTION game_result_winning_seats(game jsonb) RETURNS INT [] LANGUAGE sql IMMUTABLE AS $$
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

CREATE FUNCTION game_result_cards(game jsonb) RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN total BETWEEN -2147483648 AND 2147483647 THEN total::int END
  FROM (
    SELECT SUM(CASE WHEN jsonb_typeof(entry.value #> '{cards,total,0}') = 'number'
                 THEN round((entry.value #>> '{cards,total,0}')::numeric) END) AS total
    FROM jsonb_array_elements(CASE jsonb_typeof(game -> 'statistic') WHEN 'array' THEN game -> 'statistic' ELSE '[]'::jsonb END) AS entry
  ) AS sum
$$;

CREATE TABLE game_results (
  gameid INT PRIMARY KEY REFERENCES games (id) ON DELETE CASCADE,
  created timestamptz NOT NULL,
  lastplayed timestamptz NOT NULL,
  n_players INT NOT NULL,
  coop BOOLEAN,
  winning_seats INT [] NOT NULL,
  cards INT
);

CREATE INDEX game_results_competitive_idx ON game_results (created) WHERE coop = FALSE;
CREATE INDEX game_results_coop_idx ON game_results (n_players, created) WHERE coop = TRUE;

CREATE FUNCTION game_results_sync() RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
CREATE TRIGGER game_results_insert AFTER INSERT ON games FOR EACH ROW WHEN (NOT NEW.running) EXECUTE FUNCTION game_results_sync();
CREATE TRIGGER game_results_update AFTER UPDATE OF running, game, created, lastplayed, n_players ON games FOR EACH ROW WHEN (NOT NEW.running OR NOT OLD.running) EXECUTE FUNCTION game_results_sync();

CREATE TABLE saveGames (
  id SERIAL PRIMARY KEY,
  gameid INT NOT NULL,
  game jsonb NOT NULL
);

CREATE TABLE waitingGames (
  id SERIAL PRIMARY KEY,
  gameid INT,
  nPlayers INT NOT NULL CHECK(
    nPlayers = 4
    OR nPlayers = 6
  ),
  nTeams INT NOT NULL CHECK(
    nTeams = 1
    OR nTeams = 2
    OR (
      nTeams = 3
      AND nPlayers = 6
    )
  ),
  meister Boolean NOT NULL,
  private Boolean NOT NULL,
  adminPlayer INT NOT NULL REFERENCES users (id) CHECK (
    adminPlayer = player0
    OR adminPlayer = player1
    OR adminPlayer = player2
    OR adminPlayer = player3
    OR adminPlayer = player4
    OR adminPlayer = player5
  ),
  bots INT ARRAY [6] NOT NULL DEFAULT '{NULL,NULL,NULL,NULL,NULL,NULL}' CHECK (
    (
      bots [1] IS NULL
      OR (
        bots [1] IS NOT NULL
        AND player0 IS NULL
      )
    )
    AND (
      bots [2] IS NULL
      OR (
        bots [2] IS NOT NULL
        AND player1 IS NULL
      )
    )
    AND (
      bots [3] IS NULL
      OR (
        bots [3] IS NOT NULL
        AND player2 IS NULL
      )
    )
    AND (
      bots [4] IS NULL
      OR (
        bots [4] IS NOT NULL
        AND player3 IS NULL
      )
    )
    AND (
      bots [5] IS NULL
      OR (
        bots [5] IS NOT NULL
        AND player4 IS NULL
      )
    )
    AND (
      bots [6] IS NULL
      OR (
        bots [6] IS NOT NULL
        AND player5 IS NULL
      )
    )
  ),
  player0 INT REFERENCES users (id),
  player1 INT REFERENCES users (id),
  player2 INT REFERENCES users (id),
  player3 INT REFERENCES users (id),
  player4 INT REFERENCES users (id),
  player5 INT REFERENCES users (id),
  balls0 varchar(30) CHECK (
    (
      balls0 IS NULL
      AND player0 IS NULL
      AND bots [1] IS NULL
    )
    OR (
      balls0 IS NOT NULL
      AND bots [1] IS NOT NULL
    )
    OR (
      balls0 IS NOT NULL
      AND player0 IS NOT NULL
    )
  ),
  balls1 varchar(30) CHECK (
    (
      balls1 IS NULL
      AND player1 IS NULL
      AND bots [2] IS NULL
    )
    OR (
      balls1 IS NOT NULL
      AND bots [2] IS NOT NULL
    )
    OR (
      balls1 IS NOT NULL
      AND player1 IS NOT NULL
    )
  ),
  balls2 varchar(30) CHECK (
    (
      balls2 IS NULL
      AND player2 IS NULL
      AND bots [3] IS NULL
    )
    OR (
      balls2 IS NOT NULL
      AND bots [3] IS NOT NULL
    )
    OR (
      balls2 IS NOT NULL
      AND player2 IS NOT NULL
    )
  ),
  balls3 varchar(30) CHECK (
    (
      balls3 IS NULL
      AND player3 IS NULL
      AND bots [4] IS NULL
    )
    OR (
      balls3 IS NOT NULL
      AND bots [4] IS NOT NULL
    )
    OR (
      balls3 IS NOT NULL
      AND player3 IS NOT NULL
    )
  ),
  balls4 varchar(30) CHECK (
    (
      balls4 IS NULL
      AND player4 IS NULL
      AND bots [5] IS NULL
    )
    OR (
      balls4 IS NOT NULL
      AND bots [5] IS NOT NULL
    )
    OR (
      balls4 IS NOT NULL
      AND player4 IS NOT NULL
    )
  ),
  balls5 varchar(30) CHECK (
    (
      balls5 IS NULL
      AND player5 IS NULL
      AND bots [6] IS NULL
    )
    OR (
      balls5 IS NOT NULL
      AND bots [6] IS NOT NULL
    )
    OR (
      balls5 IS NOT NULL
      AND player5 IS NOT NULL
    )
  ),
  ready0 boolean NOT NULL DEFAULT false CHECK(
    ready0 = false
    OR player0 IS NOT NULL
  ),
  ready1 boolean NOT NULL DEFAULT false CHECK(
    ready1 = false
    OR player1 IS NOT NULL
  ),
  ready2 boolean NOT NULL DEFAULT false CHECK(
    ready2 = false
    OR player2 IS NOT NULL
  ),
  ready3 boolean NOT NULL DEFAULT false CHECK(
    ready3 = false
    OR player3 IS NOT NULL
  ),
  ready4 boolean NOT NULL DEFAULT false CHECK(
    ready4 = false
    OR player4 IS NOT NULL
  ),
  ready5 boolean NOT NULL DEFAULT false CHECK(
    ready5 = false
    OR player5 IS NOT NULL
  ),
  -- Set on every change of the waiting game (trigger below); waiting games without a change for a while are closed
  lastactivity timestamptz NOT NULL DEFAULT current_timestamp,
  CONSTRAINT unique_players CHECK (
    (
      player0 IS NULL
      OR (
        player0 != player1
        AND player0 != player2
        AND player0 != player3
        AND player0 != player4
        AND player0 != player5
      )
    )
    AND (
      player1 IS NULL
      OR (
        player1 != player0
        AND player1 != player2
        AND player1 != player3
        AND player1 != player4
        AND player1 != player5
      )
    )
    AND (
      player2 IS NULL
      OR (
        player2 != player0
        AND player2 != player1
        AND player2 != player3
        AND player2 != player4
        AND player2 != player5
      )
    )
    AND (
      player3 IS NULL
      OR (
        player3 != player0
        AND player3 != player1
        AND player3 != player2
        AND player3 != player4
        AND player3 != player5
      )
    )
    AND (
      player4 IS NULL
      OR (
        player4 != player0
        AND player4 != player1
        AND player4 != player2
        AND player4 != player3
        AND player4 != player5
      )
    )
    AND (
      player5 IS NULL
      OR (
        player5 != player0
        AND player5 != player1
        AND player5 != player2
        AND player5 != player3
        AND player5 != player4
      )
    )
  ),
  CONSTRAINT unique_balls CHECK (
    (
      balls0 IS NULL
      OR (
        balls0 != balls1
        AND balls0 != balls2
        AND balls0 != balls3
        AND balls0 != balls4
        AND balls0 != balls5
      )
    )
    AND (
      balls1 IS NULL
      OR (
        balls1 != balls0
        AND balls1 != balls2
        AND balls1 != balls3
        AND balls1 != balls4
        AND balls1 != balls5
      )
    )
    AND (
      balls2 IS NULL
      OR (
        balls2 != balls0
        AND balls2 != balls1
        AND balls2 != balls3
        AND balls2 != balls4
        AND balls2 != balls5
      )
    )
    AND (
      balls3 IS NULL
      OR (
        balls3 != balls0
        AND balls3 != balls1
        AND balls3 != balls2
        AND balls3 != balls4
        AND balls3 != balls5
      )
    )
    AND (
      balls4 IS NULL
      OR (
        balls4 != balls0
        AND balls4 != balls1
        AND balls4 != balls2
        AND balls4 != balls3
        AND balls4 != balls5
      )
    )
    AND (
      balls5 IS NULL
      OR (
        balls5 != balls0
        AND balls5 != balls1
        AND balls5 != balls2
        AND balls5 != balls3
        AND balls5 != balls4
      )
    )
  ),
  CONSTRAINT correct_number_of_players CHECK(
    nPlayers = 6
    OR (
      nPlayers = 4
      AND player4 IS NULL
      AND player5 IS NULL
      AND balls4 IS NULL
      AND balls5 IS NULL
      AND ready4 = false
      AND ready5 = false
      AND bots [5] IS NULL
      AND bots [6] IS NULL
    )
  )
);

CREATE FUNCTION waitinggames_touch() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.lastactivity := current_timestamp;
  RETURN NEW;
END
$$;

-- Every change counts as activity: joining, leaving, ready, colors, order and bots
CREATE TRIGGER waitinggames_touch BEFORE UPDATE ON waitinggames FOR EACH ROW EXECUTE FUNCTION waitinggames_touch();

CREATE TABLE hof (
  id SERIAL PRIMARY KEY,
  userid INT NOT NULL REFERENCES users (id),
  status VARCHAR(20) NOT NULL CHECK(
    status = 'verlag'
    OR status = 'spende'
    OR status = 'translation'
  )
);

CREATE TABLE user_agent_data (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  counter INT NOT NULL DEFAULT(1)
);

CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  group_chat Boolean DEFAULT(false),
  group_name VARCHAR(25),
  created timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  sender INTEGER REFERENCES users (id) ON DELETE
  SET
    NULL,
    chatid INTEGER NOT NULL REFERENCES chats (id),
    body TEXT NOT NULL,
    created timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE users_to_chats (
  id SERIAL PRIMARY KEY,
  userid INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  chatid INTEGER NOT NULL REFERENCES chats (id),
  UNIQUE (userid, chatid)
);

CREATE TABLE chat_messages_unread (
  id SERIAL PRIMARY KEY,
  messageid INTEGER NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
  users_to_chats_id INTEGER NOT NULL REFERENCES users_to_chats (id) ON DELETE CASCADE
);

CREATE TABLE channel_messages (
  id SERIAL PRIMARY KEY,
  channel VARCHAR(25) NOT NULL,
  sender INTEGER REFERENCES users (id) ON DELETE
  SET
    NULL,
    body TEXT NOT NULL,
    created timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE logs (
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB,
  timestamp timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE moderation (
  id SERIAL PRIMARY KEY,
  insertedbyuserid INT NOT NULL,
  userid INT,
  email varchar(255),
  blockeduntil timestamptz NOT NULL,
  reason varchar(200)
);

-- Games against the AI in the browser (#256): only how they ended, without any account or name. The game itself
-- runs in the browser; the client reports the result at the end. mode: klassisch, drei or koop; level: the AI level
-- (see onlineStufen.ts); won: whether the team of the human won; cards: the cards in coop.
CREATE TABLE offline_results (
  id SERIAL PRIMARY KEY,
  created timestamptz NOT NULL DEFAULT current_timestamp,
  mode varchar(10) NOT NULL,
  level varchar(20) NOT NULL,
  won BOOLEAN NOT NULL,
  cards INT
);
