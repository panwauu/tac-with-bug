-- Run with psql, not inside a transaction block. The whole file can be run again safely.
\set ON_ERROR_STOP on

-- Games against the AI in the browser: only how they ended, without any account or name.
CREATE TABLE IF NOT EXISTS offline_results (
  id SERIAL PRIMARY KEY,
  created timestamptz NOT NULL DEFAULT current_timestamp,
  mode varchar(10) NOT NULL,
  level varchar(20) NOT NULL,
  won BOOLEAN NOT NULL,
  cards INT
);

-- The old tutorial is replaced by the training in the browser
DROP TABLE IF EXISTS tutorials;
ALTER TABLE users DROP COLUMN IF EXISTS tutorial;

-- Moderators: trusted members of the community who handle reports and can block users.
-- Admins name them on the moderation page or by hand: UPDATE users SET moderator = TRUE WHERE username = '...';
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderator BOOLEAN NOT NULL DEFAULT FALSE;

-- Reports of users about other users (name, picture, profile text, chat). Moderators handle them.
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporterid INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  userid INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category varchar(20) NOT NULL,
  body varchar(500) NOT NULL DEFAULT '',
  created timestamptz NOT NULL DEFAULT current_timestamp,
  handled timestamptz,
  handledbyuserid INT REFERENCES users (id) ON DELETE SET NULL
);

-- When a block was issued, for the moderation history of a user. Blocks from before this column get the
-- time of the migration, not their real date.
ALTER TABLE moderation ADD COLUMN IF NOT EXISTS created timestamptz NOT NULL DEFAULT current_timestamp;

-- A report can quote a chat or channel message. The server copies the text, because messages expire.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS message_created timestamptz;
