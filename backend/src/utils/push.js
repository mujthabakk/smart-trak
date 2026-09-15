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

// data.type picks the sound — the only three sound files bundled in the
// app. Matched case-insensitively; anything unrecognised (including a
// missing type) falls back to 'normal'. Android needs no sound/channel
// field at all — since Android 8 the sound comes from the notification
// channel, which the app itself configures and picks based on `data.type`.
const SOUND_BY_TYPE = {
  normal: { iosSound: 'normal_notfication_sound.aiff', apnsPriority: '5' },
  alert: { iosSound: 'alert_warning.aiff', apnsPriority: '10' },
  warning: { iosSound: 'alert_warning.aiff', apnsPriority: '10' },
  ringing: { iosSound: 'ring.aiff', apnsPriority: '10' },
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

  // Rule 1: never send a top-level `notification` block, for ANY type — if
  // present, Android's FCM SDK draws its own banner before the app's code
  // runs, always with the default channel's sound, and (for ringing) never
  // as a full-screen ring. title/body live only in `data` (Android reads
  // that, having no notification block to read) and in apns.alert (iOS).
  // The two copies must stay identical, or the same event can show as two
  // different notifications across platforms — and the app also
  // de-duplicates on (title, body, type) within a 45s window, so repeated
  // test pushes with identical text look "lost" rather than re-delivered.
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
      // Rule 2: ringing must stay data-only on Android — the full-screen
      // ring only exists if the app builds it itself, and it deliberately
      // won't when the OS already drew a banner. ttl stops a stale ring
      // from arriving long after it stopped being relevant, the way a
      // missed call shouldn't ring an hour later. The firebase-admin SDK
      // wants milliseconds (a number) here — the "45s" duration-string
      // format is only valid on the raw FCM REST API, not this SDK
      // wrapper, which rejects it.
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
          sound: sound.iosSound,
          // badge has no meaning for a ringing call screen.
          ...(isRinging ? {} : { badge: 1 }),
          // interruption-level lives inside aps, not the headers. 'critical'
          // requires an Apple entitlement this app does not have.
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
