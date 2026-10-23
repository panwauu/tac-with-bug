-- Run with psql, not inside a transaction block. The whole file can be run again safely.
\set ON_ERROR_STOP on

-- Accounts of external bots can be left out of the leaderboard of wins. Login and all other lists are not affected.
-- Set it by hand, for example: UPDATE users SET hidden_from_leaderboard = TRUE WHERE username IN ('Robooo', 'Roboooo');
ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_from_leaderboard BOOLEAN NOT NULL DEFAULT FALSE;
