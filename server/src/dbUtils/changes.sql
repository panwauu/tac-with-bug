CREATE TABLE moderation (
  id SERIAL PRIMARY KEY,
  insertedbyuserid INT NOT NULL,
  userid INT,
  email varchar(255),
  blockeduntil timestamptz NOT NULL,
  reason varchar(200)
);
