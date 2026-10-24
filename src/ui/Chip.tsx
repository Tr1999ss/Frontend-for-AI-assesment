import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/cx'
import './chip.css'

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onToggle'> {
  selected?: boolean
  /** small marker shown when selected, e.g. a rank number */
  marker?: ReactNode
}

/** Toggleable pill. */
export function Chip({ selected = false, marker, className, children, ...rest }: ChipProps) {
  return (
    <button type="button" className={cx('chip', selected && 'is-selected', className)} aria-pressed={selected} {...rest}>
      {selected && marker != null && <span className="chip-marker">{marker}</span>}
      {children}
    </button>
  )
}

/** Static pill with an optional remove button. */
export function Tag({
  children,
  onRemove,
  emphasis = false,
  className,
}: {
  children: ReactNode
  onRemove?: () => void
  emphasis?: boolean
  className?: string
}) {
  return (
    <span className={cx('tag', emphasis && 'is-emphasis', className)}>
      {children}
      {onRemove && (
        <button type="button" className="tag-remove" onClick={onRemove} aria-label="Remove">
          <X size={12} />
        </button>
      )}
    </span>
  )
}
