/**
 * Mock Notification Service
 * In a real application, this would integrate with FCM (Firebase Cloud Messaging)
 * or APNS to send push notifications to mobile devices.
 */

async function sendPushNotification(userIds, title, body, data = {}) {
  // Mock delivery
  console.log(`[PUSH NOTIFICATION] Sending to users: ${userIds.join(', ')}`);
  console.log(`[PUSH NOTIFICATION] Title: ${title}`);
  console.log(`[PUSH NOTIFICATION] Body: ${body}`);
  console.log(`[PUSH NOTIFICATION] Data: ${JSON.stringify(data)}`);
  return true;
}

module.exports = { sendPushNotification };
