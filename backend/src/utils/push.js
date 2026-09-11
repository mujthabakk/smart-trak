const fs = require('fs');
const path = require('path');
const env = require('../config/env');

/**
 * Push-notification sender, backed by the Firebase Admin SDK when
 * FCM_CREDENTIALS_PATH is set; otherwise falls back to the original stub
 * (logs only) so every call site keeps working with no push configured.
 */

let messaging = null;
let initAttempted = false;

function getMessaging() {
  if (messaging || initAttempted) return messaging;
  initAttempted = true;
  if (!env.fcmCredentialsPath) return null;

  try {
    // Resolved relative to the process's working directory (where .env
    // itself is loaded from), not this file's location — env vars name
    // paths relative to where the app runs, not relative to src/utils/.
    const credentialPath = path.resolve(process.cwd(), env.fcmCredentialsPath);
    const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));

    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK for push notifications:', err.message);
  }
  return messaging;
}

// data.type picks the sound channel — the only three sound files bundled in
// the iOS app. Matched case-insensitively; anything unrecognised (including
// a missing type) falls back to 'normal', same as the mobile app's own rule.
const SOUND_BY_TYPE = {
  normal: { file: 'normal_notfication_sound.aiff', apnsPriority: '5' },
  alert: { file: 'alert_warning.aiff', apnsPriority: '10' },
  warning: { file: 'alert_warning.aiff', apnsPriority: '10' },
  ringing: { file: 'ring.aiff', apnsPriority: '10' },
};

function soundFor(type) {
  return SOUND_BY_TYPE[String(type || '').toLowerCase()] || SOUND_BY_TYPE.normal;
}

async function sendPush({ token, title, body, data }) {
  if (!token) return { status: 'skipped', reason: 'no fcm_token on file' };

  const msg = getMessaging();
  if (!msg) {
    console.log(`[push:stub] would send to ${token}: "${title}" — ${body}`, data || {});
    return { status: 'stubbed' };
  }

  const isRinging = String(data?.type || '').toLowerCase() === 'ringing';
  const sound = soundFor(data?.type);

  // No top-level `notification` block — if present, Android's FCM SDK draws
  // its own banner before the app runs, always with the default channel's
  // sound and never as a full-screen ring. title/body live only here (for
  // Android, which has no notification block to read) and in apns.alert
  // below (for iOS); the two copies must stay identical or the same event
  // can dedupe as two different notifications across platforms.
  const stringData = {
    ...(data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}),
    title,
    body,
  };

  const message = {
    token,
    data: stringData,
    android: {
      priority: 'high',
      // Stops a stale ring from being delivered long after it stopped being
      // relevant, the way a missed call shouldn't ring an hour later.
      // The firebase-admin SDK wants milliseconds (a number) here — the
      // "45s" duration-string format is only valid on the raw FCM REST API,
      // not this SDK wrapper, and the SDK rejects it outright.
      ...(isRinging ? { ttl: 45000 } : {}),
    },
    apns: {
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': sound.apnsPriority,
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: sound.file,
          // 'critical' requires an Apple entitlement this app does not have.
          ...(isRinging ? { 'interruption-level': 'time-sensitive' } : {}),
        },
      },
    },
  };

  try {
    const messageId = await msg.send(message);
    return { status: 'sent', messageId };
  } catch (err) {
    console.error(`Failed to send push notification to ${token}:`, err.message);
    return { status: 'failed', reason: err.message };
  }
}

module.exports = { sendPush };
