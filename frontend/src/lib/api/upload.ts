import { apiClient } from './client'

/** Uploads an image (multipart/form-data) and returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await apiClient.post<{ url: string }>('/upload', formData)
  return data.url
}
