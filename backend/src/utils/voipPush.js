const http2 = require('http2');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Direct-to-Apple PushKit VoIP sender — this is the ONLY way to trigger
 * full-screen CallKit ringing on iOS; FCM cannot deliver VoIP-type pushes.
 * Requires APNS_KEY_ID/APNS_TEAM_ID/APNS_P8 (see .env.example); falls back to
 * a no-op stub when unset, mirroring push.js's getMessaging() fallback, so
 * this ships safely before real Apple credentials exist.
 */

// Apple rate-limits provider-token generation — cache and reuse the signed
// JWT for up to 20 minutes rather than signing one per push.
const PROVIDER_TOKEN_MAX_AGE_MS = 20 * 60 * 1000;
let cachedToken = null;
let cachedAt = 0;

function getProviderToken() {
  if (!env.apns.keyId || !env.apns.teamId || !env.apns.p8) return null;
  if (cachedToken && Date.now() - cachedAt < PROVIDER_TOKEN_MAX_AGE_MS) return cachedToken;

  cachedToken = jwt.sign(
    { iss: env.apns.teamId, iat: Math.floor(Date.now() / 1000) },
    env.apns.p8.replace(/\\n/g, '\n'),
    { algorithm: 'ES256', header: { alg: 'ES256', kid: env.apns.keyId } }
  );
  cachedAt = Date.now();
  return cachedToken;
}

const RINGING_TTL_SECONDS = 5 * 60;

/**
 * PushKit payload is flat custom JSON, not wrapped in `aps` — it's delivered
 * straight to the app's PushKit delegate, never through system notification
 * UI, so there's no "caller identity" concept in this schema to draw on;
 * nameCaller/handle default to title/body (e.g. "Bus approaching" / the
 * student+stop message) unless the caller passes explicit values.
 */
async function sendVoipPush({ voipToken, title, body, type, id, nameCaller, handle }) {
  if (!voipToken) return { status: 'skipped', reason: 'no voip_token on file' };

  const payload = JSON.stringify({
    type: String(type || 'ringing'),
    title: String(title || ''),
    body: String(body || ''),
    id: id != null ? String(id) : '',
    nameCaller: String(nameCaller ?? title ?? ''),
    handle: String(handle ?? body ?? ''),
  });

  const token = getProviderToken();
  if (!token) {
    console.log(`[voip:stub] would send VoIP push to ${voipToken}: "${title}" — ${body}`);
    return { status: 'stubbed' };
  }

  const host = env.apns.production ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';

  return new Promise((resolve) => {
    const session = http2.connect(`https://${host}`);
    session.on('error', (err) => {
      resolve({ status: 'failed', reason: err.message });
    });

    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${voipToken}`,
      authorization: `bearer ${token}`,
      'apns-topic': `${env.apns.bundleId}.voip`,
      'apns-push-type': 'voip',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + RINGING_TTL_SECONDS),
      'content-type': 'application/json',
    });

    let status = 0;
    let raw = '';
    req.on('response', (headers) => {
      status = headers[':status'];
    });
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      session.close();
      if (status === 200) {
        resolve({ status: 'sent' });
      } else {
        console.error(`Failed to send VoIP push to ${voipToken}: apns ${status} ${raw}`);
        resolve({ status: 'failed', reason: `apns ${status}: ${raw}` });
      }
    });
    req.on('error', (err) => {
      resolve({ status: 'failed', reason: err.message });
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendVoipPush };
