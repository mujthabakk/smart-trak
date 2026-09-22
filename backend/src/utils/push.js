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

// data.type picks the Android notification channel + sound (must match the
// channels the app declares) and the iOS sound file. Matched
// case-insensitively; anything unrecognised (including a missing type)
// falls back to 'normal'. Ringing has no iOS alert sound — full-screen
// ringing on iOS goes over a separate PushKit VoIP push (see voipPush.js),
// never through this FCM/APNs-alert path.
const CHANNEL_BY_TYPE = {
  normal: { channelId: 'normal_channel_v5', androidSound: 'res_normal_notfication_sound', iosSound: 'normal_notfication_sound.aiff', apnsPriority: '5' },
  alert: { channelId: 'alert_channel_v5', androidSound: 'res_alert_warning', iosSound: 'alert_warning.aiff', apnsPriority: '10' },
  warning: { channelId: 'alert_channel_v5', androidSound: 'res_alert_warning', iosSound: 'alert_warning.aiff', apnsPriority: '10' },
  ringing: { channelId: 'ringing_channel_v5', androidSound: 'res_ring', iosSound: null, apnsPriority: '10' },
};

const RINGING_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000;

function channelFor(type) {
  return CHANNEL_BY_TYPE[String(type || '').toLowerCase()] || CHANNEL_BY_TYPE.normal;
}

async function sendPush({ token, title, body, data }) {
  if (!token) return { status: 'skipped', reason: 'no fcm_token on file' };

  const type = String(data?.type || '').toLowerCase();
  const isRinging = type === 'ringing';
  const channel = channelFor(type);
  const id = data?.id != null ? String(data.id) : '';

  // Every value the app reads from `data` must be a string — Android has no
  // notification block to fall back on when the app is force-stopped
  // (data-only pushes get silently dropped by several OEMs), so the
  // notification block below AND this data map both always carry
  // title/body/channel/sound, kept identical so the same event can't show up
  // differently on the two platforms.
  const stringData = {
    ...(data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}),
    id,
    title,
    body,
    type,
    channel_id: channel.channelId,
    sound: channel.androidSound,
    ios_sound: channel.iosSound || '',
  };

  const message = {
    token,
    data: stringData,
    android: {
      priority: 'high',
      ttl: isRinging ? RINGING_TTL_MS : DEFAULT_TTL_MS,
      directBootOk: true,
      notification: {
        title,
        body,
        channelId: channel.channelId,
        sound: channel.androidSound,
        tag: `st_${type || 'normal'}`,
      },
    },
    // iOS ringing with no voip_token on file is a deliberate degraded
    // fallback (banner only, no CallKit) rather than silence — the caller
    // (notifications.service.js) only reaches this function for ringing when
    // there's no voip_token to route a real PushKit push to instead.
    apns: {
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': channel.apnsPriority,
      },
      payload: {
        aps: {
          alert: { title, body },
          ...(channel.iosSound ? { sound: channel.iosSound } : {}),
          ...(isRinging ? { 'interruption-level': 'time-sensitive' } : { badge: 1 }),
        },
      },
    },
  };

  const msg = getMessaging();
  if (!msg) {
    console.log(`[push:stub] would send to ${token}: "${title}" — ${body}`, stringData);
    return { status: 'stubbed' };
  }

  try {
    const messageId = await msg.send(message);
    return { status: 'sent', messageId };
  } catch (err) {
    console.error(`Failed to send push notification to ${token}:`, err.message);
    return { status: 'failed', reason: err.message };
  }
}

module.exports = { sendPush };
