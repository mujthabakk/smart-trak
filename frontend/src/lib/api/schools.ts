import { apiClient, type ApiPagination } from './client'
import type { School, SchoolStatus } from '@/types'
import type { User } from '@/store/slices/authSlice'

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

export async function createSchool(payload: Partial<School> & { school_code?: string }): Promise<School> {
  const { data } = await apiClient.post<{ school: School }>('/schools', payload)
  return data.school
}

/** Live availability check for the Add School form's School Code field. */
export async function checkSchoolCodeAvailable(code: string): Promise<boolean> {
  const { data } = await apiClient.get<{ available: boolean }>('/schools/check-code', { params: { code } })
  return data.available
}

export async function updateSchool(id: string, payload: Partial<School>): Promise<School> {
  const { data } = await apiClient.patch<{ school: School }>(`/schools/${id}`, payload)
  return data.school
}

export async function deleteSchool(id: string): Promise<void> {
  await apiClient.delete(`/schools/${id}`)
}

/** Issues a school_admin-scoped session for this school's admin, so a
 * super_admin can log in as them directly (see authSlice's startImpersonation). */
export async function impersonateSchoolAdmin(id: string): Promise<{ user: User; token: string }> {
  const { data } = await apiClient.post<{ user: User; token: string }>(`/schools/${id}/impersonate`)
  return data
}

export interface SchoolApplicationInput {
  school_code: string
  school_name: string
  admin_name?: string
  email: string
  phone: string
  website?: string
  address?: string
  city?: string
  state?: string
  post_code?: string
  country?: string
  timezone?: string
  latitude?: number
  longitude?: number
  students?: number
  buses?: number
  plan_id: string
}

/** Public self-service "Onboard your school" signup (no auth) — creates a
 * pending school for super_admin review; credentials are emailed only once
 * it's approved, not at signup time. */
export async function applyForSchool(payload: SchoolApplicationInput): Promise<{ id: string; name: string; status: string }> {
  const { data } = await apiClient.post<{ school: { id: string; name: string; status: string } }>('/schools/apply', payload)
  return data.school
}
