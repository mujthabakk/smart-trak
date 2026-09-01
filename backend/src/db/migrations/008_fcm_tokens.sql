-- ---------------------------------------------------------------------------
-- FCM device tokens (multi-device push token registry)
--
-- Replaces the single users.fcm_token column (kept in place for backward
-- compatibility) with a per-device table: a user can be logged into more
-- than one device (phone + tablet, or a reinstall) and each needs its own
-- token remembered and rotated independently. device_id is a client-
-- generated identifier persisted locally on the device across app opens.
-- ---------------------------------------------------------------------------
CREATE TABLE fcm_tokens (
  id TEXT PRIMARY KEY DEFAULT next_code('FCM'),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios','android','web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
