import { apiClient, type ApiPagination } from './client'
import type { AttendanceRecord, AttendanceStatus } from '@/types'

export interface ListAttendanceParams {
  trip_id?: string
  student_id?: string
  date?: string
  status?: AttendanceStatus
  page?: number
  pageSize?: number
}

export async function listAttendance(params: ListAttendanceParams = {}): Promise<{ records: AttendanceRecord[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/attendance', { params })
  return data
}

export async function markAttendance(payload: { trip_id: string; student_id: string; status: AttendanceStatus; stop_id?: string }): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<{ record: AttendanceRecord }>('/attendance', payload)
  return data.record
}

export async function markAttendanceBulk(tripId: string, records: Array<{ student_id: string; status: AttendanceStatus; stop_id?: string }>): Promise<AttendanceRecord[]> {
  const { data } = await apiClient.post<{ records: AttendanceRecord[] }>('/attendance/bulk', { trip_id: tripId, records })
  return data.records
}

export async function updateAttendance(id: string, payload: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const { data } = await apiClient.patch<{ record: AttendanceRecord }>(`/attendance/${id}`, payload)
  return data.record
}

export async function deleteAttendance(id: string): Promise<void> {
  await apiClient.delete(`/attendance/${id}`)
}
