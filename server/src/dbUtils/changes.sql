ALTER TABLE
    users DROP CONSTRAINT users_notification_settings_check;

UPDATE
    users
SET
    notification_settings = array_cat(
        notification_settings [1:3],
        -- elements 1–3
        notification_settings [5:6] -- elements 5–6
    );

ALTER TABLE
    users
ADD
    CONSTRAINT users_notification_settings_check CHECK (array_length(notification_settings, 1) = 5);

ALTER TABLE
    users
ALTER COLUMN
    notification_settings
SET
    DEFAULT array_fill(TRUE, ARRAY [5]);

ALTER TABLE
    users DROP COLUMN currentsubscription;

-- Do this later!
DROP TABLE subscriptions;