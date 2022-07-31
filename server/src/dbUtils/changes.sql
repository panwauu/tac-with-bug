ALTER TABLE
    games
ADD
    COLUMN running BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE
    games
SET
    running = FALSE
WHERE
    status != 'running';

ALTER TABLE
    users_to_games DROP CONSTRAINT users_to_games_player_index_check;

ALTER TABLE
    users_to_games
ADD
    CONSTRAINT users_to_games_player_index_check CHECK (player_index >= 0);

ALTER TABLE
    games DROP COLUMN status;