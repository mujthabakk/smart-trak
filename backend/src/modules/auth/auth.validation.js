const { z } = require('zod');

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  school_id: z.string().optional(),
});

const forgotPassword = z.object({
  email: z.string().email(),
  school_id: z.string().optional(),
});

const verifyOtp = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  school_id: z.string().optional(),
});

const resetPassword = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(6),
  school_id: z.string().optional(),
});

const changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const updateProfile = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  avatar: z.string().optional(),
});

const updateFcmToken = z.object({
  fcm_token: z.string().min(1),
});

const registerDeviceToken = z.object({
  device_id: z.string().min(1),
  fcm_token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  voip_token: z.string().min(1).optional(),
});

module.exports = {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  updateProfile,
  updateFcmToken,
  registerDeviceToken,
};
