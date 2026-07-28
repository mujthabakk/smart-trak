import { apiClient, type ApiPagination } from './client'
import type { Route, Stop, TripType } from '@/types'

export interface ListRoutesParams {
  school_id?: string
  page?: number
  pageSize?: number
  search?: string
  type?: TripType
  bus_id?: string
  is_active?: boolean
}

export interface RouteInput {
  name: string
  type: TripType
  start_point: string
  end_point: string
  bus_id?: string
  driver_id?: string
  is_active?: boolean
  stops?: Array<Partial<Stop>>
}

export async function listRoutes(params: ListRoutesParams = {}): Promise<{ routes: Route[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/routes', { params })
  return data
}

export async function getRoute(id: string): Promise<Route> {
  const { data } = await apiClient.get<{ route: Route }>(`/routes/${id}`)
  return data.route
}

export async function createRoute(payload: RouteInput & { school_id?: string }): Promise<Route> {
  const { data } = await apiClient.post<{ route: Route }>('/routes', payload)
  return data.route
}

export async function updateRoute(id: string, payload: Partial<RouteInput>): Promise<Route> {
  const { data } = await apiClient.patch<{ route: Route }>(`/routes/${id}`, payload)
  return data.route
}

export async function deleteRoute(id: string): Promise<void> {
  await apiClient.delete(`/routes/${id}`)
}
