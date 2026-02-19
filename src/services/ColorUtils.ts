export interface DerivedColors {
  tint: string
  tintDark: string
  checked: string
  quantityBg: string
}

export interface ThemeColors {
  light: DerivedColors
  dark: DerivedColors
}

interface HSL {
  h: number
  s: number
  l: number
}

export function hexToHsl(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 }
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100
  const lNorm = l / 100

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c; g = x; b = 0
  } else if (h < 120) {
    r = x; g = c; b = 0
  } else if (h < 180) {
    r = 0; g = c; b = x
  } else if (h < 240) {
    r = 0; g = x; b = c
  } else if (h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  const toHex = (v: number): string => {
    const hex = Math.round((v + m) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}

/**
 * Derive all theme color variants from a single user-chosen hex color.
 *
 * Based on analysis of the existing green palette:
 * - Light tint:       HSL(H, S, 49%)   - the base color
 * - Light tintDark:   HSL(H, S+3, 39%) - darker for pressed states
 * - Light checked:    HSL(H, S-4, 74%) - light bg for checked items
 * - Light quantityBg: HSL(H, S, 93%)   - very light bg for badges
 * - Dark tint:        HSL(H, S-4, 56%) - lighter for dark mode
 * - Dark tintDark:    HSL(H, S+2, 44%) - between light variants
 * - Dark checked:     HSL(H, S-15, 24%)- very dark, desaturated
 * - Dark quantityBg:  HSL(H, S-2, 17%) - very dark
 */
export function deriveThemeColors(baseHex: string): ThemeColors {
  const { h, s } = hexToHsl(baseHex)

  return {
    light: {
      tint: hslToHex(h, clamp(s, 30, 100), 49),
      tintDark: hslToHex(h, clamp(s + 3, 30, 100), 39),
      checked: hslToHex(h, clamp(s - 4, 15, 80), 74),
      quantityBg: hslToHex(h, clamp(s, 15, 80), 93),
    },
    dark: {
      tint: hslToHex(h, clamp(s - 4, 25, 100), 56),
      tintDark: hslToHex(h, clamp(s + 2, 25, 100), 44),
      checked: hslToHex(h, clamp(s - 15, 10, 60), 24),
      quantityBg: hslToHex(h, clamp(s - 2, 10, 60), 17),
    },
  }
}
