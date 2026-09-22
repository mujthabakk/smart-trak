-- iOS PushKit VoIP token, one per device row alongside the existing FCM
-- token — needed for full-screen CallKit ringing, which must go straight to
-- Apple's APNs (never through FCM). Nullable: Android/web rows never have
-- one, and iOS rows won't either until the app registers a PushKit token.
ALTER TABLE fcm_tokens ADD COLUMN voip_token TEXT;
