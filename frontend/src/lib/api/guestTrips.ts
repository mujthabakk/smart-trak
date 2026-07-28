import { apiClient, type ApiPagination } from './client'
import type { GuestTrip, GuestTripStatus } from '@/types'

export interface ListGuestTripsParams {
  status?: GuestTripStatus
  page?: number
  pageSize?: number
}

export async function listGuestTrips(params: ListGuestTripsParams = {}): Promise<{ trips: GuestTrip[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/guest-trips', { params })
  return data
}

export async function getGuestTrip(id: string): Promise<GuestTrip> {
  const { data } = await apiClient.get<{ trip: GuestTrip }>(`/guest-trips/${id}`)
  return data.trip
}

export async function createGuestTrip(payload: {
  guest_driver_name: string
  guest_driver_phone: string
  bus_registration: string
  student_ids: string[]
}): Promise<GuestTrip> {
  const { data } = await apiClient.post<{ trip: GuestTrip }>('/guest-trips', payload)
  return data.trip
}

export async function updateGuestTrip(id: string, payload: Partial<GuestTrip>): Promise<GuestTrip> {
  const { data } = await apiClient.patch<{ trip: GuestTrip }>(`/guest-trips/${id}`, payload)
  return data.trip
}
