import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'
import './card.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** false for edge-to-edge content such as tables and lists */
  padded?: boolean
  elevated?: boolean
}

export function Card({ padded = true, elevated = false, className, ...rest }: CardProps) {
  return <div className={cx('card', padded && 'card-padded', elevated && 'card-elevated', className)} {...rest} />
}

export interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function CardHeader({ title, description, icon, actions, className }: CardHeaderProps) {
  return (
    <div className={cx('card-header', className)}>
      {icon && <span className="card-icon">{icon}</span>}
      <div className="card-heading">
        <h3 className="card-title">{title}</h3>
        {description && <p className="card-description">{description}</p>}
      </div>
      {actions && <div className="card-actions">{actions}</div>}
    </div>
  )
}

export function CardSection({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card-section', className)} {...rest} />
}
