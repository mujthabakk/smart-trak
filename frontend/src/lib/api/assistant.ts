import { apiClient } from './client'

/** Asks the AI Assistant a free-form question about today's live school
 * data (students, buses, drivers, attendance, leave) — answered server-side
 * by Gemini using a snapshot of that data as context. */
export async function askAssistant(question: string): Promise<string> {
  const { data } = await apiClient.post<{ answer: string }>('/assistant/query', { question })
  return data.answer
}
