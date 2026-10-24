import type { ReactNode } from 'react'
import { Check, Monitor, Moon, Palette, RotateCcw, Sun } from 'lucide-react'
import { BACKEND_URL } from '../config'
import { cx } from '../lib/cx'
import { useTheme } from '../theme/ThemeProvider'
import { ACCENT_PRESETS, type Density, type FontChoice, type MotionPreference, type Radius, type ThemeMode } from '../theme/themes'
import { Button, Dialog, Segmented, type SegmentedOption } from '../ui'

const MODES: SegmentedOption<ThemeMode>[] = [
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
  { value: 'system', label: 'System', icon: <Monitor /> },
]
const DENSITIES: SegmentedOption<Density>[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Default' },
  { value: 'spacious', label: 'Spacious' },
]
const RADII: SegmentedOption<Radius>[] = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'soft', label: 'Soft' },
]
const FONTS: SegmentedOption<FontChoice>[] = [
  { value: 'inter', label: 'Inter' },
  { value: 'system', label: 'System' },
  { value: 'mono', label: 'Mono' },
]
const MOTION: SegmentedOption<MotionPreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'full', label: 'Full' },
  { value: 'reduced', label: 'Reduced' },
]

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, reset } = useTheme()
  const isPreset = ACCENT_PRESETS.some((p) => p.value === settings.accent)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      icon={<Palette />}
      title="Appearance"
      description="Changes apply instantly and are saved in this browser."
      footer={
        <Button variant="ghost" icon={<RotateCcw />} onClick={reset}>
          Reset to defaults
        </Button>
      }
    >
      <div className="settings">
        <Setting label="Theme">
          <Segmented block options={MODES} value={settings.mode} onChange={(mode) => update({ mode })} aria-label="Theme" />
        </Setting>

        <Setting label="Accent color">
          <div className="swatches">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={cx('swatch', settings.accent === preset.value && 'is-active')}
                style={{ background: preset.value }}
                title={preset.name}
                aria-label={preset.name}
                aria-pressed={settings.accent === preset.value}
                onClick={() => update({ accent: preset.value })}
              >
                {settings.accent === preset.value && <Check size={14} />}
              </button>
            ))}
            <label className={cx('swatch swatch-custom', !isPreset && 'is-active')} title="Custom color">
              <input type="color" value={settings.accent} onChange={(e) => update({ accent: e.target.value })} aria-label="Custom accent color" />
            </label>
          </div>
        </Setting>

        <Setting label="Density" hint="Spacing and control sizes">
          <Segmented block options={DENSITIES} value={settings.density} onChange={(density) => update({ density })} aria-label="Density" />
        </Setting>

        <Setting label="Corners">
          <Segmented block options={RADII} value={settings.radius} onChange={(radius) => update({ radius })} aria-label="Corners" />
        </Setting>

        <Setting label="Font">
          <Segmented block options={FONTS} value={settings.font} onChange={(font) => update({ font })} aria-label="Font" />
        </Setting>

        <Setting label="Motion" hint="System follows your OS reduced-motion setting">
          <Segmented block options={MOTION} value={settings.motion} onChange={(motion) => update({ motion })} aria-label="Motion" />
        </Setting>

        <div className="settings-preview" aria-hidden>
          <div className="settings-preview-bar" />
          <div className="settings-preview-row">
            <span className="settings-preview-pill" />
            <span className="settings-preview-line" />
          </div>
          <div className="settings-preview-row">
            <span className="settings-preview-button">Primary</span>
            <span className="settings-preview-ghost">Secondary</span>
          </div>
        </div>

        <p className="xsmall muted">
          API calls go through the dev server proxy to <span className="mono">{BACKEND_URL}</span> (BACKEND_URL in .env).
        </p>
      </div>
    </Dialog>
  )
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <section className="setting">
      <div className="setting-head">
        <span className="setting-label">{label}</span>
        {hint && <span className="xsmall muted">{hint}</span>}
      </div>
      {children}
    </section>
  )
}
