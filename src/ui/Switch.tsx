import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useFieldControl } from './Field'
import './switch.css'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
  size?: 'sm' | 'md'
  'aria-label'?: string
}

export function Switch({ checked, onChange, label, disabled, size = 'md', ...aria }: SwitchProps) {
  const field = useFieldControl()
  const control = (
    <button
      type="button"
      role="switch"
      id={label ? undefined : field?.id}
      aria-checked={checked}
      disabled={disabled}
      className={cx('switch', `switch-${size}`, checked && 'is-on')}
      onClick={() => onChange(!checked)}
      {...aria}
    >
      <span className="switch-thumb" />
    </button>
  )
  if (!label) return control
  return (
    <label className={cx('switch-label', disabled && 'is-disabled')}>
      {control}
      <span>{label}</span>
    </label>
  )
}
