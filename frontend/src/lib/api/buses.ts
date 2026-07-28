import { apiClient, type ApiPagination } from './client'
import type { Bus, BusLocation } from '@/types'

export interface ListBusesParams {
  school_id?: string
  page?: number
  pageSize?: number
  search?: string
  is_active?: boolean
}

export interface BusInput {
  bus_number: string
  seat_capacity: number
  make_model?: string
  year?: number
  insurance_expiry?: string
  fitness_cert_expiry?: string
  driver_id?: string
}

export async function listBuses(params: ListBusesParams = {}): Promise<{ buses: Bus[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/buses', { params })
  return data
}

export async function getBus(id: string): Promise<Bus> {
  const { data } = await apiClient.get<{ bus: Bus }>(`/buses/${id}`)
  return data.bus
}

/** Bulk-creates one or more buses in a single request (AddBus.tsx submits multiple rows at once). */
export async function createBuses(buses: BusInput[], schoolId?: string): Promise<Bus[]> {
  const { data } = await apiClient.post<{ buses: Bus[] }>('/buses', { buses, school_id: schoolId })
  return data.buses
}

export async function updateBus(id: string, payload: Partial<Bus>): Promise<Bus> {
  const { data } = await apiClient.patch<{ bus: Bus }>(`/buses/${id}`, payload)
  return data.bus
}

export async function deleteBus(id: string): Promise<void> {
  await apiClient.delete(`/buses/${id}`)
}

export async function getBusLocation(id: string): Promise<BusLocation | null> {
  const { data } = await apiClient.get<{ location: BusLocation | null }>(`/buses/${id}/location`)
  return data.location
}
