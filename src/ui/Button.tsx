import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../lib/cx'
import { Spinner } from './Loading'
import './button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  block?: boolean
  ref?: Ref<HTMLButtonElement>
}

/** Defaults to type="button"; pass type="submit" explicitly inside forms. Icon-only buttons need aria-label. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconOnly = children == null || children === false
  return (
    <button
      type={type}
      className={cx(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        iconOnly && 'btn-icon',
        block && 'btn-block',
        loading && 'is-loading',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="1.05em" /> : icon}
      {!iconOnly && <span className="btn-label">{children}</span>}
      {iconRight}
    </button>
  )
}
