-- The old tutorial is replaced by the training in the browser
DROP TABLE IF EXISTS tutorials;
ALTER TABLE users DROP COLUMN IF EXISTS tutorial;

-- Progress of a user outside of the online games: statistics of games against the AI, achievements and finished
-- lessons, so that they follow the user from one device to another. data holds counters, marks and the last games
-- (see services/progress.ts), changes the ids of the last applied changes: a change that arrives twice counts once.
CREATE TABLE IF NOT EXISTS user_progress (
  userid INT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  changes TEXT [] NOT NULL DEFAULT '{}',
  updated timestamptz NOT NULL DEFAULT current_timestamp
);
