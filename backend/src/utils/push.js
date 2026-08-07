/**
 * Push-notification sender — currently a stub. Nothing sends a real push yet
 * (no firebase-admin credentials configured); this just logs so the call site
 * (notifications.service.js) already has the right shape wired in.
 *
 * To go live: install `firebase-admin`, initialize it from FCM_CREDENTIALS_PATH
 * (see backend/.env.example), and replace the body of sendPush with a call to
 * admin.messaging().send({ token, notification: { title, body }, data }).
 */
async function sendPush({ token, title, body, data }) {
  if (!token) return { status: 'skipped', reason: 'no fcm_token on file' };

  console.log(`[push:stub] would send to ${token}: "${title}" — ${body}`, data || {});
  return { status: 'stubbed' };
}

module.exports = { sendPush };
