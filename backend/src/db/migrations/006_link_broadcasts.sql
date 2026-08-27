ALTER TABLE notifications ADD COLUMN broadcast_id TEXT REFERENCES broadcasts(id) ON DELETE CASCADE;
CREATE INDEX idx_notifications_broadcast_id ON notifications(broadcast_id);
