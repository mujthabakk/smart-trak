import { apiClient, type ApiPagination } from './client'
import type { Driver } from '@/types'

export interface ListDriversParams {
  school_id?: string
  page?: number
  pageSize?: number
  search?: string
  is_active?: boolean
  is_guest?: boolean
}

export interface DriverInput {
  name: string
  employee_id: string
  email: string
  phone: string
  whatsapp?: string
  license_number: string
  license_expiry: string
  photo_url?: string
  address?: string
  assigned_bus_id?: string | null
  is_active?: boolean
  // Editing a guest driver's own validity after creation — no-ops for a
  // non-guest driver.
  guest_validity_type?: 'trips' | 'days'
  guest_max_trips?: number
  guest_expires_at?: string
  guest_trips_used?: number
}

export async function listDrivers(params: ListDriversParams = {}): Promise<{ drivers: Driver[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/drivers', { params })
  return data
}

export async function getDriver(id: string): Promise<Driver> {
  const { data } = await apiClient.get<{ driver: Driver }>(`/drivers/${id}`)
  return data.driver
}

export async function createDriver(payload: DriverInput & { school_id?: string }): Promise<Driver> {
  const { data } = await apiClient.post<{ driver: Driver }>('/drivers', payload)
  return data.driver
}

export interface GuestDriverInput {
  school_id?: string
  name: string
  email: string
  phone: string
  license_number: string
  license_expiry: string
  guest_validity_type: 'trips' | 'days'
  guest_validity_value: number
}

export interface GuestDriverCredentials {
  email: string
  password: string
}

/** Creates a real driver account that can log in and run trips like any
 * other driver, but expires after N trips or N days. The returned
 * credentials.password is shown exactly once — it's never retrievable
 * again afterward (also emailed to the driver, best-effort). */
export async function createGuestDriver(payload: GuestDriverInput): Promise<{ driver: Driver; credentials: GuestDriverCredentials }> {
  const { data } = await apiClient.post<{ driver: Driver; credentials: GuestDriverCredentials }>('/drivers/guest', payload)
  return data
}

export async function updateDriver(id: string, payload: Partial<DriverInput>): Promise<Driver> {
  const { data } = await apiClient.patch<{ driver: Driver }>(`/drivers/${id}`, payload)
  return data.driver
}

export async function deleteDriver(id: string): Promise<void> {
  await apiClient.delete(`/drivers/${id}`)
}

export async function getExpiringDriverDocuments(days = 30, schoolId?: string): Promise<Driver[]> {
  const { data } = await apiClient.get<{ drivers: Driver[] }>('/drivers/expiring-documents', {
    params: { days, school_id: schoolId },
  })
  return data.drivers
}
