import { apiClient } from './client'
import type { Plan } from '@/types'

export async function listPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<{ plans: Plan[] }>('/plans')
  return data.plans
}

export async function getPlan(id: string): Promise<Plan> {
  const { data } = await apiClient.get<{ plan: Plan }>(`/plans/${id}`)
  return data.plan
}

export async function createPlan(payload: Partial<Plan>): Promise<Plan> {
  const { data } = await apiClient.post<{ plan: Plan }>('/plans', payload)
  return data.plan
}

export async function updatePlan(id: string, payload: Partial<Plan>): Promise<Plan> {
  const { data } = await apiClient.patch<{ plan: Plan }>(`/plans/${id}`, payload)
  return data.plan
}

export async function deletePlan(id: string): Promise<void> {
  await apiClient.delete(`/plans/${id}`)
}
