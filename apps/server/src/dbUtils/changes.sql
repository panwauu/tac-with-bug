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
