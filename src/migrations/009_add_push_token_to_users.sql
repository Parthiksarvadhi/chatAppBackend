ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(500);
CREATE INDEX idx_users_push_token ON users(push_token);
