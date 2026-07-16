import { apiClient, type ApiPagination } from './client'
import type { SupportTicket, TicketReply, TicketStatus, TicketPriority } from '@/types'

export interface ListTicketsParams {
  status?: TicketStatus
  priority?: TicketPriority
  school_id?: string
  page?: number
  pageSize?: number
}

export async function listTickets(params: ListTicketsParams = {}): Promise<{ tickets: SupportTicket[]; pagination: ApiPagination }> {
  const { data } = await apiClient.get('/tickets', { params })
  return data
}

export async function getTicket(id: string): Promise<SupportTicket> {
  const { data } = await apiClient.get<{ ticket: SupportTicket }>(`/tickets/${id}`)
  return data.ticket
}

export async function createTicket(payload: { type: string; priority: TicketPriority; description: string }): Promise<SupportTicket> {
  const { data } = await apiClient.post<{ ticket: SupportTicket }>('/tickets', payload)
  return data.ticket
}

export async function updateTicket(id: string, payload: Partial<SupportTicket>): Promise<SupportTicket> {
  const { data } = await apiClient.patch<{ ticket: SupportTicket }>(`/tickets/${id}`, payload)
  return data.ticket
}

export async function replyToTicket(id: string, content: string): Promise<SupportTicket> {
  const { data } = await apiClient.post<{ ticket: SupportTicket }>(`/tickets/${id}/replies`, { content })
  return data.ticket
}

export type { TicketReply }
