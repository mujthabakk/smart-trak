const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./auth.controller');
const schema = require('./auth.validation');

const router = express.Router();

router.post('/login', validate({ body: schema.login }), controller.login);
router.post('/forgot-password', validate({ body: schema.forgotPassword }), controller.forgotPassword);
router.post('/verify-otp', validate({ body: schema.verifyOtp }), controller.verifyOtp);
router.post('/reset-password', validate({ body: schema.resetPassword }), controller.resetPassword);
router.get('/me', requireAuth, controller.me);
router.post('/logout', requireAuth, controller.logout);
router.patch('/change-password', requireAuth, validate({ body: schema.changePassword }), controller.changePassword);
router.patch('/fcm-token', requireAuth, validate({ body: schema.updateFcmToken }), controller.updateFcmToken);

// Multi-device push token registry — supersedes the single-token endpoint
// above for clients that want more than one device remembered per user.
// One upsert endpoint handles both first-time registration and later token
// rotation (e.g. FCM's onTokenRefresh) for the same device_id.
router.post('/fcm-tokens', requireAuth, validate({ body: schema.registerDeviceToken }), controller.registerDeviceToken);

module.exports = router;
