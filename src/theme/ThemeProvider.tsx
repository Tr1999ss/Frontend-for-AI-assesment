import { createContext, useCallback, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useMediaQuery, usePersistentState } from '../lib/hooks'
import { DEFAULT_THEME, THEME_STORAGE_KEY, contrastText, type ThemeSettings } from './themes'

interface ThemeContextValue {
  settings: ThemeSettings
  resolvedMode: 'light' | 'dark'
  update: (patch: Partial<ThemeSettings>) => void
  reset: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistentState<Partial<ThemeSettings>>(THEME_STORAGE_KEY, DEFAULT_THEME)
  // Merge so settings saved by an older version pick up defaults for newer options.
  const settings = useMemo(() => ({ ...DEFAULT_THEME, ...stored }), [stored])
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const resolvedMode = settings.mode === 'system' ? (systemDark ? 'dark' : 'light') : settings.mode

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedMode
    root.dataset.density = settings.density
    root.dataset.radius = settings.radius
    root.dataset.font = settings.font
    root.dataset.motion = settings.motion
    root.style.setProperty('--accent', settings.accent)
    root.style.setProperty('--accent-contrast', contrastText(settings.accent))
    root.style.colorScheme = resolvedMode
  }, [settings, resolvedMode])

  const reducedMotion = settings.motion === 'reduced' || (settings.motion === 'system' && systemReduced)

  const update = useCallback(
    (patch: Partial<ThemeSettings>) => {
      const apply = () => flushSync(() => setStored((prev) => ({ ...prev, ...patch })))
      // Cross-fade light/dark switches where the View Transitions API exists.
      if ('mode' in patch && !reducedMotion && typeof document.startViewTransition === 'function') {
        document.startViewTransition(apply)
      } else {
        apply()
      }
    },
    [setStored, reducedMotion],
  )

  const reset = useCallback(() => setStored(DEFAULT_THEME), [setStored])

  const value = useMemo(() => ({ settings, resolvedMode, update, reset }), [settings, resolvedMode, update, reset])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
