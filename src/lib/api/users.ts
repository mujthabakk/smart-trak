import { apiClient, type ApiPagination } from './client'
import type { User } from '@/store/authStore'

export interface ListUsersParams {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  school_id?: string
}

export interface CreateUserPayload extends Partial<User> {
  password: string
}

export async function listUsers(params: ListUsersParams = {}): Promise<{ users: User[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/users', { params })
  return data
}

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>(`/users/${id}`)
  return data.user
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>('/users', payload)
  return data.user
}

export async function updateUser(id: string, payload: Partial<User> & { password?: string }): Promise<User> {
  const { data } = await apiClient.patch<{ user: User }>(`/users/${id}`, payload)
  return data.user
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}
