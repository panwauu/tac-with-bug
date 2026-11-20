-- The old tutorial is replaced by the training in the browser
DROP TABLE IF EXISTS tutorials;
ALTER TABLE users DROP COLUMN IF EXISTS tutorial;

-- Public tournaments with a fluid size: n_teams is the maximum, the tournament starts with at least min_teams teams.
-- NULL keeps the fixed size of all existing tournaments.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS min_teams INTEGER;
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_min_teams_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_min_teams_check CHECK(min_teams IS NULL OR (min_teams >= 2 AND min_teams <= n_teams));
