import { StyleSheet } from 'react-native-unistyles'

const shared = {
  typography: {
    fontSizeL: 18,
    fontSizeM: 16,
    fontSizeS: 14,
    fontSizeXS: 12,
  },
  sizes: {
    radiusSm: 8,
    radiusLg: 16,
    screenPadding: 16,
    itemHeight: 60,
  },
}

const lightTheme = {
  colors: {
    text: '#1a1a1a',
    textSecondary: '#757575',
    textOnTint: '#ffffff',
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceBorder: '#e0e0e0',
    tint: '#4CAF50',
    tintDark: '#388E3C',
    danger: '#ef5350',
    dangerLight: '#ffcdd2',
    checked: '#a5d6a7',
    quantityBg: '#e8f5e9',
  },
  isLight: true,
  ...shared,
}

type Theme = typeof lightTheme

const darkTheme: Theme = {
  colors: {
    text: '#e0e0e0',
    textSecondary: '#9e9e9e',
    textOnTint: '#ffffff',
    background: '#121212',
    surface: '#1e1e1e',
    surfaceBorder: '#333333',
    tint: '#66BB6A',
    tintDark: '#43A047',
    danger: '#ef5350',
    dangerLight: '#4a1c1c',
    checked: '#2e4a2e',
    quantityBg: '#1b3a1b',
  },
  isLight: false,
  ...shared,
}

type AppThemes = { light: Theme; dark: Theme }

const breakpoints = {
  s: 0,
  m: 480,
  l: 1024,
} as const

type Breakpoints = typeof breakpoints

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends Breakpoints {}
}

StyleSheet.configure({
  themes: { light: lightTheme, dark: darkTheme },
  breakpoints,
  settings: { adaptiveThemes: true },
})
