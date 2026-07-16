import { apiClient, type ApiPagination } from './client'
import type { Subscription, SubscriptionStatus } from '@/types'

export interface ListSubscriptionsParams {
  page?: number
  pageSize?: number
  school_id?: string
  status?: SubscriptionStatus
}

export async function listSubscriptions(params: ListSubscriptionsParams = {}): Promise<{ subscriptions: Subscription[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/subscriptions', { params })
  return data
}

export async function getSubscription(id: string): Promise<Subscription> {
  const { data } = await apiClient.get<{ subscription: Subscription }>(`/subscriptions/${id}`)
  return data.subscription
}

export async function createSubscription(payload: Partial<Subscription>): Promise<Subscription> {
  const { data } = await apiClient.post<{ subscription: Subscription }>('/subscriptions', payload)
  return data.subscription
}

export async function updateSubscription(id: string, payload: Partial<Subscription>): Promise<Subscription> {
  const { data } = await apiClient.patch<{ subscription: Subscription }>(`/subscriptions/${id}`, payload)
  return data.subscription
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiClient.delete(`/subscriptions/${id}`)
}
