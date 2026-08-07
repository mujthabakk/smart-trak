import { apiClient, type ApiPagination } from './client'
import type { EmailLog } from '@/types'

export interface ListEmailLogsParams {
  page?: number
  pageSize?: number
}

export async function listEmailLogs(params: ListEmailLogsParams = {}): Promise<{ emailLogs: EmailLog[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/email-logs', { params })
  return data
}
