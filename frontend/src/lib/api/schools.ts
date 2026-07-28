import { apiClient, type ApiPagination } from './client'
import type { School, SchoolStatus } from '@/types'

export interface ListSchoolsParams {
  page?: number
  pageSize?: number
  search?: string
  status?: SchoolStatus
}

export async function listSchools(params: ListSchoolsParams = {}): Promise<{ schools: School[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/schools', { params })
  return data
}

export async function getSchool(id: string): Promise<School> {
  const { data } = await apiClient.get<{ school: School }>(`/schools/${id}`)
  return data.school
}

export async function createSchool(payload: Partial<School>): Promise<School> {
  const { data } = await apiClient.post<{ school: School }>('/schools', payload)
  return data.school
}

export async function updateSchool(id: string, payload: Partial<School>): Promise<School> {
  const { data } = await apiClient.patch<{ school: School }>(`/schools/${id}`, payload)
  return data.school
}

export async function deleteSchool(id: string): Promise<void> {
  await apiClient.delete(`/schools/${id}`)
}
