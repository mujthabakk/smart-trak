import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type UserRole = 'super_admin' | 'school_admin' | 'driver' | 'guest_driver' | 'parent'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string
  school_id?: string
  school_name?: string
  avatar?: string
  fcm_token?: string
  created_at?: string
  last_login?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  role: UserRole | null
}

const TOKEN_STORAGE_KEY = 'smarttrack-auth-token'
const USER_STORAGE_KEY = 'smarttrack-auth-user'

function loadInitialState(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    const rawUser = localStorage.getItem(USER_STORAGE_KEY)
    if (token && rawUser) {
      const user = JSON.parse(rawUser) as User
      return { user, token, isAuthenticated: true, role: user.role }
    }
  } catch {
    // ignore corrupt storage
  }
  return { user: null, token: null, isAuthenticated: false, role: null }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    login(state, action: PayloadAction<{ user: User; token: string }>) {
      const { user, token } = action.payload
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      state.user = user
      state.token = token
      state.isAuthenticated = true
      state.role = user.role
    },
    logout(state) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.role = null
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (!state.user) return
      const updated = { ...state.user, ...action.payload }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated))
      state.user = updated
      state.role = updated.role
    },
  },
})

export const { login, logout, updateUser } = authSlice.actions
export default authSlice.reducer
