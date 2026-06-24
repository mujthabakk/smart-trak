import { create } from 'zustand';

// The app is locked to the Electric theme in light mode.
export type Theme =
  | 'electric'
  | 'royal'
  | 'forest'
  | 'crimson'
  | 'midnight'
  | 'ocean';

export type ColorMode = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  colorMode: ColorMode;
  setTheme: (theme: Theme) => void;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  initTheme: () => void;
}

const FIXED_THEME: Theme = 'electric';

function applyElectricLight(): void {
  document.documentElement.setAttribute('data-theme', FIXED_THEME);
  document.documentElement.classList.remove('dark');
}

// Theme switching is intentionally disabled — every surface uses Electric (light).
export const useThemeStore = create<ThemeState>((set) => ({
  theme: FIXED_THEME,
  colorMode: 'light',

  setTheme: () => {
    applyElectricLight();
    set({ theme: FIXED_THEME, colorMode: 'light' });
  },

  toggleColorMode: () => {
    applyElectricLight();
    set({ theme: FIXED_THEME, colorMode: 'light' });
  },

  setColorMode: () => {
    applyElectricLight();
    set({ theme: FIXED_THEME, colorMode: 'light' });
  },

  initTheme: () => {
    applyElectricLight();
    set({ theme: FIXED_THEME, colorMode: 'light' });
  },
}));
