CREATE TABLE moderation (
  id SERIAL PRIMARY KEY,
  userid INT,
  email varchar(255),
  blockeduntil timestamptz NOT NULL,
  reason varchar(200)
);
