-- The old tutorial is replaced by the training in the browser
DROP TABLE IF EXISTS tutorials;
ALTER TABLE users DROP COLUMN IF EXISTS tutorial;