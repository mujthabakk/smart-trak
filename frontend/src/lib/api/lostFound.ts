import { apiClient, type ApiPagination } from './client'
import type { LostFoundItem, LFClaim, LostFoundStatus } from '@/types'

export interface ListLostFoundParams {
  bus_id?: string
  status?: LostFoundStatus
  page?: number
  pageSize?: number
}

export async function listLostFound(params: ListLostFoundParams = {}): Promise<{ items: LostFoundItem[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/lost-found', { params })
  return data
}

export async function getLostFoundItem(id: string): Promise<LostFoundItem> {
  const { data } = await apiClient.get<{ item: LostFoundItem }>(`/lost-found/${id}`)
  return data.item
}

export async function reportLostFoundItem(payload: { bus_id: string; driver_id: string; description: string; photo_url?: string; image_url?: string }): Promise<LostFoundItem> {
  const { data } = await apiClient.post<{ item: LostFoundItem }>('/lost-found', payload)
  return data.item
}

export async function updateLostFoundItem(id: string, payload: Partial<LostFoundItem>): Promise<LostFoundItem> {
  const { data } = await apiClient.patch<{ item: LostFoundItem }>(`/lost-found/${id}`, payload)
  return data.item
}

export async function deleteLostFoundItem(id: string): Promise<void> {
  await apiClient.delete(`/lost-found/${id}`)
}

export async function claimLostFoundItem(id: string, payload: { student_id: string; claim_note?: string }): Promise<LFClaim> {
  const { data } = await apiClient.post<{ claim: LFClaim }>(`/lost-found/${id}/claims`, payload)
  return data.claim
}

export async function updateLostFoundClaim(id: string, claimId: string, payload: Partial<LFClaim>): Promise<LFClaim> {
  const { data } = await apiClient.patch<{ claim: LFClaim }>(`/lost-found/${id}/claims/${claimId}`, payload)
  return data.claim
}
