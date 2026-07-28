import { apiClient, type ApiPagination } from './client'
import type { Leave, LeaveStatus } from '@/types'

export interface ListLeaveParams {
  student_id?: string
  status?: LeaveStatus
  page?: number
  pageSize?: number
}

export async function listLeave(params: ListLeaveParams = {}): Promise<{ leaves: Leave[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/leave', { params })
  return data
}

export async function getLeave(id: string): Promise<Leave> {
  const { data } = await apiClient.get<{ leave: Leave }>(`/leave/${id}`)
  return data.leave
}

export async function createLeave(payload: { student_id: string; from_date: string; to_date: string; reason?: string }): Promise<Leave> {
  const { data } = await apiClient.post<{ leave: Leave }>('/leave', payload)
  return data.leave
}

export async function updateLeave(id: string, payload: Partial<Leave>): Promise<Leave> {
  const { data } = await apiClient.patch<{ leave: Leave }>(`/leave/${id}`, payload)
  return data.leave
}

export async function deleteLeave(id: string): Promise<void> {
  await apiClient.delete(`/leave/${id}`)
}
