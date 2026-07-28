import { apiClient, type ApiPagination } from './client'
import type { AppNotification } from '@/types'

export interface ListNotificationsParams {
  is_read?: boolean
  type?: AppNotification['type']
  page?: number
  pageSize?: number
}

export async function listNotifications(params: ListNotificationsParams = {}): Promise<{ notifications: AppNotification[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/notifications', { params })
  return data
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count')
  return data.count
}

export async function createNotification(payload: { user_id: string; school_id?: string; title: string; body: string; type: AppNotification['type']; action_url?: string }): Promise<AppNotification> {
  const { data } = await apiClient.post<{ notification: AppNotification }>('/notifications', payload)
  return data.notification
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const { data } = await apiClient.patch<{ notification: AppNotification }>(`/notifications/${id}/read`)
  return data.notification
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all')
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`)
}
