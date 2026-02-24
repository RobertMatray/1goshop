import { create } from 'zustand'
import { UnistylesRuntime } from 'react-native-unistyles'
import AsyncStorage from '@react-native-async-storage/async-storage'

const THEME_STORAGE_KEY = '@app_theme'
export type ThemeMode = 'auto' | 'light' | 'dark'

export interface ThemeStoreState {
  themeMode: ThemeMode
  isLoaded: boolean
  load: () => Promise<void>
  setTheme: (theme: ThemeMode) => Promise<void>
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  themeMode: 'auto',
  isLoaded: false,

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY)
      if (saved && isValidThemeMode(saved)) {
        set({ themeMode: saved, isLoaded: true })
        applyTheme(saved)
      } else {
        set({ isLoaded: true })
      }
    } catch (error) {
      console.warn('[ThemeStore] Failed to load theme:', error)
      set({ isLoaded: true })
    }
  },

  setTheme: async (themeMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode)
      set({ themeMode })
      applyTheme(themeMode)
    } catch (error) {
      console.warn('[ThemeStore] Failed to save theme:', error)
    }
  },
}))

function isValidThemeMode(value: string): value is ThemeMode {
  return value === 'auto' || value === 'light' || value === 'dark'
}

function applyTheme(mode: ThemeMode): void {
  if (mode === 'auto') {
    UnistylesRuntime.setAdaptiveThemes(true)
  } else {
    UnistylesRuntime.setAdaptiveThemes(false)
    UnistylesRuntime.setTheme(mode)
  }
}
