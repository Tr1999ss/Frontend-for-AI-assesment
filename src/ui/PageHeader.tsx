import type { ReactNode } from 'react'
import './page-header.css'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  /** content under the title row: stats, tabs, filters */
  children?: ReactNode
}

export function PageHeader({ title, description, icon, actions, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        {icon && <span className="page-header-icon">{icon}</span>}
        <div className="grow">
          <h1 className="page-header-title">{title}</h1>
          {description && <p className="page-header-description">{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
