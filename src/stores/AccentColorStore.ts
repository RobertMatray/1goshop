import { create } from 'zustand'
import { UnistylesRuntime } from 'react-native-unistyles'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import { deriveThemeColors } from '../services/ColorUtils'
import { defaultLightColors, defaultDarkColors } from '../unistyles'

const ACCENT_COLOR_KEY = '@accent_color'
const SAVED_COLORS_KEY = '@saved_colors'

export interface SavedColor {
  id: string
  hex: string
  createdAt: string
}

export interface AccentColorStoreState {
  activeColor: string | null
  savedColors: SavedColor[]
  isLoaded: boolean
  load: () => Promise<void>
  setActiveColor: (hex: string | null) => void
  addSavedColor: (hex: string) => void
  removeSavedColor: (id: string) => void
}

export const useAccentColorStore = create<AccentColorStoreState>((set, get) => ({
  activeColor: null,
  savedColors: [],
  isLoaded: false,

  load: async () => {
    try {
      const [colorStr, colorsStr] = await Promise.all([
        AsyncStorage.getItem(ACCENT_COLOR_KEY),
        AsyncStorage.getItem(SAVED_COLORS_KEY),
      ])

      let savedColors: SavedColor[] = []
      if (colorsStr) {
        try {
          savedColors = JSON.parse(colorsStr) as SavedColor[]
        } catch (error) {
          console.warn('[AccentColorStore] Failed to parse saved colors:', error)
          savedColors = []
        }
      }

      const activeColor = colorStr ?? null
      set({ activeColor, savedColors, isLoaded: true })

      if (activeColor) {
        applyAccentColor(activeColor)
      }
    } catch (error) {
      console.warn('[AccentColorStore] Failed to load accent color:', error)
      set({ isLoaded: true })
    }
  },

  setActiveColor: (hex: string | null) => {
    set({ activeColor: hex })

    if (hex) {
      applyAccentColor(hex)
      void AsyncStorage.setItem(ACCENT_COLOR_KEY, hex)
    } else {
      resetToDefaultColors()
      void AsyncStorage.removeItem(ACCENT_COLOR_KEY)
    }
  },

  addSavedColor: (hex: string) => {
    const { savedColors } = get()
    const exists = savedColors.some((c) => c.hex.toLowerCase() === hex.toLowerCase())
    if (exists) return

    const newColor: SavedColor = {
      id: randomUUID(),
      hex,
      createdAt: new Date().toISOString(),
    }

    const updated = [...savedColors, newColor]
    set({ savedColors: updated })
    persistSavedColors(updated)
  },

  removeSavedColor: (id: string) => {
    const { savedColors } = get()
    const updated = savedColors.filter((c) => c.id !== id)
    set({ savedColors: updated })
    persistSavedColors(updated)
  },
}))

function persistSavedColors(colors: SavedColor[]): void {
  void AsyncStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(colors))
}

function applyAccentColor(hex: string): void {
  const derived = deriveThemeColors(hex)

  UnistylesRuntime.updateTheme('light', (current) => ({
    ...current,
    colors: {
      ...current.colors,
      tint: derived.light.tint,
      tintDark: derived.light.tintDark,
      checked: derived.light.checked,
      quantityBg: derived.light.quantityBg,
    },
  }))

  UnistylesRuntime.updateTheme('dark', (current) => ({
    ...current,
    colors: {
      ...current.colors,
      tint: derived.dark.tint,
      tintDark: derived.dark.tintDark,
      checked: derived.dark.checked,
      quantityBg: derived.dark.quantityBg,
    },
  }))
}

function resetToDefaultColors(): void {
  UnistylesRuntime.updateTheme('light', (current) => ({
    ...current,
    colors: {
      ...current.colors,
      tint: defaultLightColors.tint,
      tintDark: defaultLightColors.tintDark,
      checked: defaultLightColors.checked,
      quantityBg: defaultLightColors.quantityBg,
    },
  }))

  UnistylesRuntime.updateTheme('dark', (current) => ({
    ...current,
    colors: {
      ...current.colors,
      tint: defaultDarkColors.tint,
      tintDark: defaultDarkColors.tintDark,
      checked: defaultDarkColors.checked,
      quantityBg: defaultDarkColors.quantityBg,
    },
  }))
}
