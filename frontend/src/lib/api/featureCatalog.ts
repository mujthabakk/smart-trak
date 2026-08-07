import { apiClient } from './client'
import type { FeatureCatalogItem } from '@/types'

export async function listFeatureCatalog(): Promise<FeatureCatalogItem[]> {
  const { data } = await apiClient.get<{ features: FeatureCatalogItem[] }>('/feature-catalog')
  return data.features
}

export async function createFeatureCatalogItem(name: string): Promise<FeatureCatalogItem> {
  const { data } = await apiClient.post<{ feature: FeatureCatalogItem }>('/feature-catalog', { name })
  return data.feature
}

export async function updateFeatureCatalogItem(id: string, name: string): Promise<FeatureCatalogItem> {
  const { data } = await apiClient.patch<{ feature: FeatureCatalogItem }>(`/feature-catalog/${id}`, { name })
  return data.feature
}

export async function deleteFeatureCatalogItem(id: string): Promise<void> {
  await apiClient.delete(`/feature-catalog/${id}`)
}
