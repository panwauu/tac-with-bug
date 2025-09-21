-- Add prefers_dark_mode column to users table
ALTER TABLE
    users
ADD
    COLUMN prefers_dark_mode BOOLEAN DEFAULT NULL;