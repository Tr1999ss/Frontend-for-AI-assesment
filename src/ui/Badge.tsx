import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'
import './badge.css'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  /** leading status dot; 'pulse' animates it */
  dot?: boolean | 'pulse'
  icon?: ReactNode
  variant?: 'soft' | 'outline'
}

export function Badge({ tone = 'neutral', dot, icon, variant = 'soft', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('badge', `badge-${tone}`, `badge-${variant}`, className)} {...rest}>
      {dot && <span className={cx('badge-dot', dot === 'pulse' && 'is-pulsing')} />}
      {icon}
      {children}
    </span>
  )
}
