const asyncHandler = require('../../utils/asyncHandler');
const { signToken } = require('../../utils/jwt');
const env = require('../../config/env');
const authService = require('./auth.service');
const studentsService = require('../students/students.service');

/** A parent's account can be linked to more than one child (siblings in
 * different classes) — anyone matching parentChildCondition via parent_details.
 * pageSize is generous since a parent's own children list is never paginated
 * in the mobile app. */
async function getChildren(user) {
  const { students } = await studentsService.list(
    user.school_id,
    { page: 1, pageSize: 50, offset: 0 },
    { parentUserId: user.id }
  );
  return students;
}

const login = asyncHandler(async (req, res) => {
  const { email, password, school_id } = req.body;
  const user = await authService.verifyCredentials(email, password, school_id);
  const token = signToken({ id: user.id, role: user.role, school_id: user.school_id || null });
  const students = user.role === 'parent' ? await getChildren(user) : undefined;
  res.json({ user, token, students });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.findUserById(req.user.id);
  const students = user.role === 'parent' ? await getChildren(user) : undefined;
  res.json({ user, students });
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

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changeOwnPassword(req.user.id, currentPassword, newPassword);
  res.json({ message: 'Password updated successfully' });
});

const updateFcmToken = asyncHandler(async (req, res) => {
  const user = await authService.updateFcmToken(req.user.id, req.body.fcm_token);
  res.json({ user });
});

const registerDeviceToken = asyncHandler(async (req, res) => {
  const { device_id, fcm_token, platform } = req.body;
  const { deviceToken, created } = await authService.registerDeviceToken(req.user.id, {
    device_id,
    token: fcm_token,
    platform,
  });
  res.status(created ? 201 : 200).json({ deviceToken });
});

module.exports = {
  login,
  me,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  updateFcmToken,
  registerDeviceToken,
};
