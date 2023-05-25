ALTER TABLE
    users
ADD
    COLUMN notification_settings BOOLEAN [] NOT NULL DEFAULT array_fill(TRUE, ARRAY [6]) CHECK (array_length(notification_settings, 1) = 6);