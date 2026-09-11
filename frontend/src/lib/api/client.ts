import axios from 'axios'
import { store } from '@/store'
import { logout } from '@/store/slices/authSlice'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
})

// Endpoints reachable with no session yet — a leftover token from a
// previous (possibly now-invalid) session must never ride along on these.
// This actually broke login: the backend's tenant middleware (tenant.js)
// resolves school_id from the Authorization header's JWT *before* it looks
// at the request body, so a stale token scoped to some other/deleted
// school silently overrode the correct school_id the user just typed,
// surfacing as "Invalid school_id" no matter what they entered.
const NO_AUTH_ENDPOINTS = ['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-otp', '/schools/apply', '/schools/check-code']

apiClient.interceptors.request.use((config) => {
  const isNoAuthEndpoint = NO_AUTH_ENDPOINTS.some((path) => config.url?.includes(path))
  const token = store.getState().auth.token
  if (token && !isNoAuthEndpoint) {
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
