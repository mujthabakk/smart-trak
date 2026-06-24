import { create } from 'zustand';

export type UserRole = 'super_admin' | 'school_admin' | 'driver' | 'guest_driver' | 'parent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  school_id?: string;
  school_name?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  initAuth: () => void;
}

const TOKEN_STORAGE_KEY = 'smarttrack-auth-token';
const USER_STORAGE_KEY = 'smarttrack-auth-user';

function loadInitialAuth(): Pick<AuthState, 'user' | 'token' | 'isAuthenticated' | 'role'> {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (token && rawUser) {
      const user = JSON.parse(rawUser) as User;
      return { user, token, isAuthenticated: true, role: user.role };
    }
  } catch {
    // ignore corrupt storage
  }
  return { user: null, token: null, isAuthenticated: false, role: null };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadInitialAuth(),

  login: (user: User, token: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    set({
      user,
      token,
      isAuthenticated: true,
      role: user.role,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
    });
  },

  updateUser: (updates: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated: User = { ...current, ...updates };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    set({
      user: updated,
      role: updated.role,
    });
  },

  initAuth: () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (token && rawUser) {
      try {
        const user = JSON.parse(rawUser) as User;
        set({ token, user, isAuthenticated: true, role: user.role });
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  },
}));
