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
