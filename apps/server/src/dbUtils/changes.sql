-- Run with psql, not inside a transaction block. The whole file can be run again safely.
\set ON_ERROR_STOP on

-- Accounts of external bots that log in like a user. Games with such an account are left out of the leaderboards,
-- like games with a bot of Tac-With-Bug. Login and everything else are not affected.
-- Set it by hand, for example: UPDATE users SET bot_account = TRUE WHERE username IN ('Robo', 'Teambo');
ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_account BOOLEAN NOT NULL DEFAULT FALSE;
