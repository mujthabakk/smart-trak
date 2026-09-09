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
  plan_type?: string
  plan_label?: string
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
  /** Set while a super_admin is "logged in as" a school_admin — holds the
   * super_admin's own session so it can be restored by stopImpersonation. */
  impersonatorUser: User | null
  impersonatorToken: string | null
}

const TOKEN_STORAGE_KEY = 'smarttrack-auth-token'
const USER_STORAGE_KEY = 'smarttrack-auth-user'
const IMPERSONATOR_TOKEN_KEY = 'smarttrack-impersonator-token'
const IMPERSONATOR_USER_KEY = 'smarttrack-impersonator-user'

function loadInitialState(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    const rawUser = localStorage.getItem(USER_STORAGE_KEY)
    if (token && rawUser) {
      const user = JSON.parse(rawUser) as User
      const impersonatorToken = localStorage.getItem(IMPERSONATOR_TOKEN_KEY)
      const rawImpersonatorUser = localStorage.getItem(IMPERSONATOR_USER_KEY)
      return {
        user, token, isAuthenticated: true, role: user.role,
        impersonatorToken: impersonatorToken || null,
        impersonatorUser: rawImpersonatorUser ? (JSON.parse(rawImpersonatorUser) as User) : null,
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return { user: null, token: null, isAuthenticated: false, role: null, impersonatorUser: null, impersonatorToken: null }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    login(state, action: PayloadAction<{ user: User; token: string }>) {
      const { user, token } = action.payload
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      localStorage.removeItem(IMPERSONATOR_TOKEN_KEY)
      localStorage.removeItem(IMPERSONATOR_USER_KEY)
      state.user = user
      state.token = token
      state.isAuthenticated = true
      state.role = user.role
      state.impersonatorUser = null
      state.impersonatorToken = null
    },
    logout(state) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(IMPERSONATOR_TOKEN_KEY)
      localStorage.removeItem(IMPERSONATOR_USER_KEY)
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.role = null
      state.impersonatorUser = null
      state.impersonatorToken = null
    },
    /** A super_admin "logging in as" a school's admin — stashes the current
     * (super_admin) session so stopImpersonation can restore it later. */
    startImpersonation(state, action: PayloadAction<{ user: User; token: string }>) {
      if (!state.user || !state.token) return
      localStorage.setItem(IMPERSONATOR_TOKEN_KEY, state.token)
      localStorage.setItem(IMPERSONATOR_USER_KEY, JSON.stringify(state.user))
      state.impersonatorToken = state.token
      state.impersonatorUser = state.user

      const { user, token } = action.payload
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      state.user = user
      state.token = token
      state.role = user.role
    },
    /** Restores the stashed super_admin session that startImpersonation saved. */
    stopImpersonation(state) {
      if (!state.impersonatorToken || !state.impersonatorUser) return
      localStorage.setItem(TOKEN_STORAGE_KEY, state.impersonatorToken)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.impersonatorUser))
      localStorage.removeItem(IMPERSONATOR_TOKEN_KEY)
      localStorage.removeItem(IMPERSONATOR_USER_KEY)
      state.user = state.impersonatorUser
      state.token = state.impersonatorToken
      state.role = state.impersonatorUser.role
      state.impersonatorUser = null
      state.impersonatorToken = null
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

export const { login, logout, updateUser, startImpersonation, stopImpersonation } = authSlice.actions
export default authSlice.reducer
