const { z } = require('zod');

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPassword = z.object({
  email: z.string().email(),
});

const verifyOtp = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const resetPassword = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(6),
});

const changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const updateFcmToken = z.object({
  fcm_token: z.string().min(1),
});

module.exports = { login, forgotPassword, verifyOtp, resetPassword, changePassword, updateFcmToken };
