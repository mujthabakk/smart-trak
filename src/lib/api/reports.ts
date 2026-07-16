import { apiClient } from './client'
import type { RevenueData, ChartData, StatsCard } from '@/types'

export async function getRevenueReport(): Promise<RevenueData[]> {
  const { data } = await apiClient.get<{ data: RevenueData[] }>('/reports/revenue')
  return data.data
}

export async function getPlatformStats(): Promise<StatsCard[]> {
  const { data } = await apiClient.get<{ stats: StatsCard[] }>('/reports/platform-stats')
  return data.stats
}

export async function getAttendanceTrend(schoolId?: string): Promise<ChartData[]> {
  const { data } = await apiClient.get<{ data: ChartData[] }>('/reports/attendance-trend', { params: { school_id: schoolId } })
  return data.data
}

export async function getFleetSummary(schoolId?: string): Promise<StatsCard[]> {
  const { data } = await apiClient.get<{ stats: StatsCard[] }>('/reports/fleet-summary', { params: { school_id: schoolId } })
  return data.stats
}

export async function getSchoolGrowth(): Promise<ChartData[]> {
  const { data } = await apiClient.get<{ data: ChartData[] }>('/reports/school-growth')
  return data.data
}
