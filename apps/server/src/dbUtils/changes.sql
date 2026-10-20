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

-- Waiting games are closed after a while without any change (job in scheduledTasks.ts). The time of the last change is
-- kept by a trigger. Waiting games that are open now start with the current time, so they are closed at the earliest
-- one expiry period after this file has been run.
ALTER TABLE waitinggames ADD COLUMN IF NOT EXISTS lastactivity timestamptz NOT NULL DEFAULT current_timestamp;

CREATE OR REPLACE FUNCTION waitinggames_touch() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.lastactivity := current_timestamp;
  RETURN NEW;
END
$$;

CREATE OR REPLACE TRIGGER waitinggames_touch BEFORE UPDATE ON waitinggames FOR EACH ROW EXECUTE FUNCTION waitinggames_touch();
