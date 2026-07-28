import { apiClient, type ApiPagination } from './client'
import type { BusTransfer, TransferStatus } from '@/types'

export interface ListBusTransfersParams {
  status?: TransferStatus
  page?: number
  pageSize?: number
}

export async function listBusTransfers(params: ListBusTransfersParams = {}): Promise<{ transfers: BusTransfer[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/bus-transfers', { params })
  return data
}

export async function getBusTransfer(id: string): Promise<BusTransfer> {
  const { data } = await apiClient.get<{ transfer: BusTransfer }>(`/bus-transfers/${id}`)
  return data.transfer
}

export async function createBusTransfer(payload: {
  original_trip_id: string
  original_bus_id: string
  new_bus_id: string
  new_driver_id?: string
  reason: string
}): Promise<BusTransfer> {
  const { data } = await apiClient.post<{ transfer: BusTransfer }>('/bus-transfers', payload)
  return data.transfer
}

export async function updateBusTransfer(id: string, payload: Partial<BusTransfer>): Promise<BusTransfer> {
  const { data } = await apiClient.patch<{ transfer: BusTransfer }>(`/bus-transfers/${id}`, payload)
  return data.transfer
}
