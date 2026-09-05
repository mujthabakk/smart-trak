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

async function sendPush({ token, title, body, data }) {
  if (!token) return { status: 'skipped', reason: 'no fcm_token on file' };

  const msg = getMessaging();
  if (!msg) {
    console.log(`[push:stub] would send to ${token}: "${title}" — ${body}`, data || {});
    return { status: 'stubbed' };
  }

  try {
    // FCM's data payload requires every value to be a string.
    const stringData = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      : undefined;
    const messageId = await msg.send({ token, notification: { title, body }, data: stringData });
    return { status: 'sent', messageId };
  } catch (err) {
    console.error(`Failed to send push notification to ${token}:`, err.message);
    return { status: 'failed', reason: err.message };
  }
}

module.exports = { sendPush };
