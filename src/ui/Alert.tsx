import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cx } from '../lib/cx'
import type { Tone } from './Badge'
import './alert.css'

const ICONS = { neutral: Info, accent: Info, info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert }

export interface AlertProps {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  onDismiss?: () => void
  className?: string
}

export function Alert({ tone = 'info', title, children, action, onDismiss, className }: AlertProps) {
  const Icon = ICONS[tone]
  return (
    <div className={cx('alert', `alert-${tone}`, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className="alert-icon" size={17} />
      <div className="grow">
        {title && <div className="alert-title">{title}</div>}
        {children && <div className="alert-body">{children}</div>}
      </div>
      {action}
      {onDismiss && (
        <button type="button" className="alert-dismiss" onClick={onDismiss} aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
