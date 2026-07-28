import { createSlice } from '@reduxjs/toolkit'

// The app is locked to the Electric theme in light mode.
export type Theme = 'electric' | 'royal' | 'forest' | 'crimson' | 'midnight' | 'ocean'
export type ColorMode = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  colorMode: ColorMode
}

const FIXED_THEME: Theme = 'electric'

function applyElectricLight(): void {
  document.documentElement.setAttribute('data-theme', FIXED_THEME)
  document.documentElement.classList.remove('dark')
}

const initialState: ThemeState = {
  theme: FIXED_THEME,
  colorMode: 'light',
}

// Theme switching is intentionally disabled — every surface uses Electric (light).
const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state) {
      applyElectricLight()
      state.theme = FIXED_THEME
      state.colorMode = 'light'
    },
    toggleColorMode(state) {
      applyElectricLight()
      state.theme = FIXED_THEME
      state.colorMode = 'light'
    },
    setColorMode(state) {
      applyElectricLight()
      state.theme = FIXED_THEME
      state.colorMode = 'light'
    },
    initTheme(state) {
      applyElectricLight()
      state.theme = FIXED_THEME
      state.colorMode = 'light'
    },
  },
})

export const { setTheme, toggleColorMode, setColorMode, initTheme } = themeSlice.actions
export default themeSlice.reducer
