import { apiClient, type ApiPagination } from './client'
import type { Trip, TripType, TripStatus } from '@/types'

export interface ListTripsParams {
  route_id?: string
  bus_id?: string
  driver_id?: string
  status?: TripStatus
  date?: string
  page?: number
  pageSize?: number
}

export async function listTrips(params: ListTripsParams = {}): Promise<{ trips: Trip[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/trips', { params })
  return data
}

export async function getTrip(id: string): Promise<Trip> {
  const { data } = await apiClient.get<{ trip: Trip }>(`/trips/${id}`)
  return data.trip
}

export interface BoardingStudent {
  id: string
  name: string
  class: string
  division: string
  student_qr_code?: string
  pickup_stop_id?: string
  drop_stop_id?: string
  status: 'present' | 'absent' | 'leave' | 'pending'
  pickup_time?: string
  drop_time?: string
  offboarded_at?: string
  stop_name?: string
  is_leave_applied: boolean
}

export async function getBoardingStudents(id: string): Promise<BoardingStudent[]> {
  const { data } = await apiClient.get<{ students: BoardingStudent[] }>(`/trips/${id}/boarding-students`)
  return data.students
}

export interface TripPathPoint {
  latitude: number
  longitude: number
  recorded_at: string
}

export async function getTripPath(id: string): Promise<TripPathPoint[]> {
  const { data } = await apiClient.get<{ points: TripPathPoint[] }>(`/trips/${id}/path`)
  return data.points
}

export async function createTrip(payload: { route_id: string; driver_id: string; bus_id: string; trip_type: TripType }): Promise<Trip> {
  const { data } = await apiClient.post<{ trip: Trip }>('/trips', payload)
  return data.trip
}

export async function updateTrip(id: string, payload: Partial<Trip>): Promise<Trip> {
  const { data } = await apiClient.patch<{ trip: Trip }>(`/trips/${id}`, payload)
  return data.trip
}

export async function deleteTrip(id: string): Promise<void> {
  await apiClient.delete(`/trips/${id}`)
}
