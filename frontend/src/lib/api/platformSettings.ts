import { apiClient } from './client'

export interface PlatformSettings {
  default_timezone: string
  updated_at: string | null
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { data } = await apiClient.get<{ settings: PlatformSettings }>('/platform-settings')
  return data.settings
}

export async function updatePlatformSettings(payload: { default_timezone: string }): Promise<PlatformSettings> {
  const { data } = await apiClient.patch<{ settings: PlatformSettings }>('/platform-settings', payload)
  return data.settings
}
