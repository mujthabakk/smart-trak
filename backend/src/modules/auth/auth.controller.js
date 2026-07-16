const asyncHandler = require('../../utils/asyncHandler');
const { signToken } = require('../../utils/jwt');
const env = require('../../config/env');
const authService = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.verifyCredentials(email, password);
  const token = signToken({ id: user.id, role: user.role, school_id: user.school_id || null });
  res.json({ user, token });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.findUserById(req.user.id);
  res.json({ user });
});

const logout = asyncHandler(async (req, res) => {
  // JWTs are stateless; logging out is a client-side token discard.
  res.status(204).send();
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { otp } = await authService.createOtp(email);
  // No email/SMS provider is wired up yet — return the OTP in non-production
  // environments so the flow is testable end-to-end.
  res.json({
    message: 'A verification code has been sent to your email',
    ...(env.nodeEnv !== 'production' ? { devOtp: otp } : {}),
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  await authService.verifyOtp(email, otp);
  res.json({ verified: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  await authService.resetPassword(email, otp, password);
  res.json({ message: 'Password reset successfully' });
});

module.exports = { login, me, logout, forgotPassword, verifyOtp, resetPassword };
