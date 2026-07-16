import { apiClient, type ApiPagination } from './client'
import type { TrainingModule, UserRole } from '@/types'

export interface ListTrainingParams {
  target_role?: UserRole
  is_published?: boolean
  page?: number
  pageSize?: number
}

export async function listTraining(params: ListTrainingParams = {}): Promise<{ trainingModules: TrainingModule[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/training', { params })
  return data
}

/** Also increments view_count server-side for non-admin viewers. */
export async function getTrainingModule(id: string): Promise<TrainingModule> {
  const { data } = await apiClient.get<{ trainingModule: TrainingModule }>(`/training/${id}`)
  return data.trainingModule
}

export async function createTrainingModule(payload: Partial<TrainingModule>): Promise<TrainingModule> {
  const { data } = await apiClient.post<{ trainingModule: TrainingModule }>('/training', payload)
  return data.trainingModule
}

export async function updateTrainingModule(id: string, payload: Partial<TrainingModule>): Promise<TrainingModule> {
  const { data } = await apiClient.patch<{ trainingModule: TrainingModule }>(`/training/${id}`, payload)
  return data.trainingModule
}

export async function deleteTrainingModule(id: string): Promise<void> {
  await apiClient.delete(`/training/${id}`)
}
