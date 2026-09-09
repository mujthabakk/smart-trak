import { apiClient, type ApiPagination } from './client'

export interface AuditLog {
  id: string
  user_id?: string
  user_name?: string
  school_id?: string
  school_name?: string
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
  created_at: string
}

export interface ListAuditLogsParams {
  school_id?: string
  entity_type?: string
  user_id?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export async function listAuditLogs(params: ListAuditLogsParams = {}): Promise<{ logs: AuditLog[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/audit-logs', { params })
  return data
}

export async function getAuditLog(id: string): Promise<AuditLog> {
  const { data } = await apiClient.get<{ log: AuditLog }>(`/audit-logs/${id}`)
  return data.log
}

/** Turns a stored action like 'student.create' or 'school.impersonate_admin'
 * into readable text ("Student Create", "School Impersonate Admin"). */
export function humanizeAuditAction(action: string): string {
  const words = action.replace(/[._]+/g, ' ').split(' ').filter(Boolean)
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
