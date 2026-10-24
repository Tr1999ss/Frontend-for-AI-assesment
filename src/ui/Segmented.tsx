import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../lib/cx'
import './segmented.css'

export interface SegmentedOption<T extends string> {
  value: T
  label?: ReactNode
  icon?: ReactNode
  title?: string
  disabled?: boolean
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  block?: boolean
  'aria-label'?: string
  className?: string
}

/** Single-choice switcher with a sliding indicator. Segments share equal widths. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  block = false,
  className,
  ...aria
}: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const style = { '--count': options.length, '--index': index } as CSSProperties
  return (
    <div
      role="radiogroup"
      className={cx('segmented', `segmented-${size}`, block && 'segmented-block', className)}
      style={style}
      {...aria}
    >
      <span className="segmented-indicator" aria-hidden />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          aria-label={option.label ? undefined : option.title}
          title={option.title}
          disabled={option.disabled}
          className={cx('segmented-item', option.value === value && 'is-active')}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label && <span>{option.label}</span>}
        </button>
      ))}
    </div>
  )
}
