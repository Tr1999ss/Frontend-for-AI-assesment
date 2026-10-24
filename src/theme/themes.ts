// Customization options. Each option maps to a data-* attribute on <html> (see tokens.css),
// so adding a choice means one entry here plus one attribute block in tokens.css.

export type ThemeMode = 'light' | 'dark' | 'system'
export type Density = 'compact' | 'comfortable' | 'spacious'
export type Radius = 'sharp' | 'rounded' | 'soft'
export type FontChoice = 'inter' | 'system' | 'mono'
export type MotionPreference = 'system' | 'full' | 'reduced'

export interface ThemeSettings {
  mode: ThemeMode
  accent: string
  density: Density
  radius: Radius
  font: FontChoice
  motion: MotionPreference
}

export const ACCENT_PRESETS = [
  { name: 'Indigo', value: '#5b5bd6' },
  { name: 'Blue', value: '#2f6fed' },
  { name: 'Teal', value: '#0e9384' },
  { name: 'Green', value: '#2f9e44' },
  { name: 'Violet', value: '#8e4ec6' },
  { name: 'Pink', value: '#d6409f' },
  { name: 'Orange', value: '#e8590c' },
  { name: 'Graphite', value: '#4b5563' },
] as const

export const DEFAULT_THEME: ThemeSettings = {
  mode: 'system',
  accent: ACCENT_PRESETS[0].value,
  density: 'comfortable',
  radius: 'rounded',
  font: 'inter',
  motion: 'system',
}

export const THEME_STORAGE_KEY = 'theme'

/** Black or white, whichever reads better on the given hex color (WCAG relative luminance). */
export function contrastText(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return '#ffffff'
  const n = parseInt(match[1], 16)
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  return luminance > 0.4 ? '#111318' : '#ffffff'
}
