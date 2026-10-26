-- Run with psql, not inside a transaction block. The whole file can be run again safely.
\set ON_ERROR_STOP on

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
