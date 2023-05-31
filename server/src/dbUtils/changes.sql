CREATE TABLE password_reset_requests (
  token CHAR(64) NOT NULL PRIMARY KEY,
  userid INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  time_of_request timestamptz NOT NULL DEFAULT current_timestamp,
  valid BOOLEAN NOT NULL DEFAULT TRUE
);
