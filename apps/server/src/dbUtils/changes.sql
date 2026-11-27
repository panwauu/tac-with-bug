-- The old tutorial is replaced by the training in the browser
DROP TABLE IF EXISTS tutorials;
ALTER TABLE users DROP COLUMN IF EXISTS tutorial;

-- Group chats can have a picture (uploaded by a member, who is kept for moderation)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_picture bytea;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_picture_changed timestamptz;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_picture_by INTEGER REFERENCES users (id) ON DELETE SET NULL;
-- Progress of a user outside of the online games: statistics of games against the AI, achievements and finished
-- lessons, so that they follow the user from one device to another. data holds counters, marks and the last games
-- (see services/progress.ts), changes the ids of the last applied changes: a change that arrives twice counts once.
CREATE TABLE IF NOT EXISTS user_progress (
  userid INT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  changes TEXT [] NOT NULL DEFAULT '{}',
  updated timestamptz NOT NULL DEFAULT current_timestamp
);

-- Public tournaments with a fluid size: n_teams is the maximum, the tournament starts with at least min_teams teams.
-- NULL keeps the fixed size of all existing tournaments.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS min_teams INTEGER;
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_min_teams_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_min_teams_check CHECK(min_teams IS NULL OR (min_teams >= 2 AND min_teams <= n_teams));
