import { apiClient, type ApiPagination } from './client'
import type { Student, ParentDetail } from '@/types'

export interface ListStudentsParams {
  school_id?: string
  page?: number
  pageSize?: number
  search?: string
  class?: string
  division?: string
  is_active?: boolean
}

export interface StudentInput {
  name: string
  class: string
  division: string
  roll_number: string
  dob: string
  gender?: string
  photo_url?: string
  pickup_stop_id?: string
  drop_stop_id?: string
  address?: string
  is_active?: boolean
  parents?: Array<Partial<ParentDetail>>
}

export async function listStudents(params: ListStudentsParams = {}): Promise<{ students: Student[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/students', { params })
  return data
}

export async function getStudent(id: string): Promise<Student> {
  const { data } = await apiClient.get<{ student: Student }>(`/students/${id}`)
  return data.student
}

export async function createStudent(payload: StudentInput & { school_id?: string }): Promise<Student> {
  const { data } = await apiClient.post<{ student: Student }>('/students', payload)
  return data.student
}

export async function updateStudent(id: string, payload: Partial<StudentInput>): Promise<Student> {
  const { data } = await apiClient.patch<{ student: Student }>(`/students/${id}`, payload)
  return data.student
}

export async function deleteStudent(id: string): Promise<void> {
  await apiClient.delete(`/students/${id}`)
}
