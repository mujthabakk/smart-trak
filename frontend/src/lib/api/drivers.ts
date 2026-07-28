import { apiClient, type ApiPagination } from './client'
import type { Driver } from '@/types'

export interface ListDriversParams {
  school_id?: string
  page?: number
  pageSize?: number
  search?: string
  is_active?: boolean
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
