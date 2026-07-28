import axios from 'axios'
import { store } from '@/store'
import { logout } from '@/store/slices/authSlice'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
})

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout())
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface ApiPagination {
  page: number
  pageSize: number
  total: number
}
