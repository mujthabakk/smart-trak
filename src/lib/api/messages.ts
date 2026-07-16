import { apiClient, type ApiPagination } from './client'
import type { Message } from '@/types'

export interface ListMessagesParams {
  school_id?: string
  sender_id?: string
  recipient_type?: Message['recipient_type']
  page?: number
  pageSize?: number
}

export async function listMessages(params: ListMessagesParams = {}): Promise<{ messages: Message[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/messages', { params })
  return data
}

export async function getMessage(id: string): Promise<Message> {
  const { data } = await apiClient.get<{ message: Message }>(`/messages/${id}`)
  return data.message
}

export async function sendMessage(payload: {
  school_id?: string
  recipient_type: Message['recipient_type']
  recipient_id?: string
  content: string
  is_scheduled?: boolean
  scheduled_at?: string
}): Promise<Message> {
  const { data } = await apiClient.post<{ message: Message }>('/messages', payload)
  return data.message
}

export async function deleteMessage(id: string): Promise<void> {
  await apiClient.delete(`/messages/${id}`)
}
