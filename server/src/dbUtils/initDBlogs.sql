CREATE TABLE logs (
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    timestamp timestamptz NOT NULL DEFAULT current_timestamp
);