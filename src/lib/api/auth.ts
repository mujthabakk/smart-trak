import { apiClient } from './client'
import type { User } from '@/store/authStore'

export interface LoginResponse {
  user: User
  token: string
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>('/auth/me')
  return data.user
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function forgotPassword(email: string): Promise<{ message: string; devOtp?: string }> {
  const { data } = await apiClient.post('/auth/forgot-password', { email })
  return data
}

export async function verifyOtp(email: string, otp: string): Promise<{ verified: boolean }> {
  const { data } = await apiClient.post('/auth/verify-otp', { email, otp })
  return data
}

export async function resetPassword(email: string, otp: string, password: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/auth/reset-password', { email, otp, password })
  return data
}
