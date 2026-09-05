import { apiClient } from './client'
import type { User } from '@/store/slices/authSlice'

export interface LoginResponse {
  user: User
  token: string
}

export async function login(email: string, password: string, school_id?: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password, school_id })
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>('/auth/me')
  return data.user
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function forgotPassword(email: string, school_id?: string): Promise<{ message: string; devOtp?: string }> {
  const { data } = await apiClient.post('/auth/forgot-password', { email, school_id })
  return data
}

export async function verifyOtp(email: string, otp: string, school_id?: string): Promise<{ verified: boolean }> {
  const { data } = await apiClient.post('/auth/verify-otp', { email, otp, school_id })
  return data
}

export async function resetPassword(email: string, otp: string, password: string, school_id?: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/auth/reset-password', { email, otp, password, school_id })
  return data
}

/** Self-service "change my own password" while logged in — requires the current password. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await apiClient.patch('/auth/change-password', { currentPassword, newPassword })
  return data
}

/** Registers this browser's FCM token so push notifications reach it —
 * upserts on (user, device_id), so re-registering the same browser just
 * refreshes its token rather than creating a duplicate. */
export async function registerFcmToken(deviceId: string, fcmToken: string): Promise<void> {
  await apiClient.post('/auth/fcm-tokens', { device_id: deviceId, fcm_token: fcmToken, platform: 'web' })
}
