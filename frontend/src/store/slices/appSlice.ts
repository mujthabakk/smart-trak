import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  createdAt: string
}

interface AppState {
  sidebarCollapsed: boolean
  notifications: Notification[]
  unreadCount: number
}

const initialState: AppState = {
  sidebarCollapsed: false,
  notifications: [],
  unreadCount: 0,
}

function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.read).length
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload
    },
    addNotification: {
      reducer(state, action: PayloadAction<Notification>) {
        state.notifications.unshift(action.payload)
        state.unreadCount = computeUnreadCount(state.notifications)
      },
      prepare(payload: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
        return {
          payload: {
            ...payload,
            id: nanoid(),
            read: false,
            createdAt: new Date().toISOString(),
          },
        }
      },
    },
    markAsRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find((n) => n.id === action.payload)
      if (n) n.read = true
      state.unreadCount = computeUnreadCount(state.notifications)
    },
    markAllRead(state) {
      state.notifications.forEach((n) => { n.read = true })
      state.unreadCount = 0
    },
    clearNotifications(state) {
      state.notifications = []
      state.unreadCount = 0
    },
  },
})

export const {
  toggleSidebar, setSidebarCollapsed, addNotification, markAsRead, markAllRead, clearNotifications,
} = appSlice.actions
export default appSlice.reducer
