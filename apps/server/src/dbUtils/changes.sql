-- The old tutorial is replaced by the training in the browser
DROP TABLE IF EXISTS tutorials;
ALTER TABLE users DROP COLUMN IF EXISTS tutorial;

-- Group chats can have a picture (uploaded by a member, who is kept for moderation)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_picture bytea;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_picture_changed timestamptz;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_picture_by INTEGER REFERENCES users (id) ON DELETE SET NULL;
