import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

interface AppState {
  sidebarCollapsed: boolean;
  notifications: Notification[];
  unreadCount: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.read).length;
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarCollapsed: false,
  notifications: [],
  unreadCount: 0,

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  addNotification: (payload) => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    const notifications = [notification, ...get().notifications];
    set({ notifications, unreadCount: computeUnreadCount(notifications) });
  },

  markAsRead: (id: string) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    set({ notifications, unreadCount: computeUnreadCount(notifications) });
  },

  markAllRead: () => {
    const notifications = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications, unreadCount: 0 });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
