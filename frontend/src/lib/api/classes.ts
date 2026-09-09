import { apiClient } from './client'

export interface Division {
  id: string
  name: string
}

export interface SchoolClass {
  id: string
  name: string
  order_index: number
  divisions: Division[]
}

export async function listClasses(): Promise<{ classes: SchoolClass[] }> {
  const { data } = await apiClient.get('/classes')
  return data
}

export async function createClass(name: string): Promise<SchoolClass> {
  const { data } = await apiClient.post<{ class: SchoolClass }>('/classes', { name })
  return data.class
}

export async function deleteClass(id: string): Promise<void> {
  await apiClient.delete(`/classes/${id}`)
}

export async function addDivision(classId: string, name: string): Promise<Division> {
  const { data } = await apiClient.post<{ division: Division }>(`/classes/${classId}/divisions`, { name })
  return data.division
}

export async function removeDivision(classId: string, divisionId: string): Promise<void> {
  await apiClient.delete(`/classes/${classId}/divisions/${divisionId}`)
}
