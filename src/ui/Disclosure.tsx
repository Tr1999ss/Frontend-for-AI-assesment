import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cx } from '../lib/cx'
import './disclosure.css'

export interface DisclosureProps {
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/** Expandable section with an animated height (CSS grid-rows trick, no measuring). */
export function Disclosure({ summary, children, defaultOpen = false, className }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cx('disclosure', open && 'is-open', className)}>
      <button type="button" className="disclosure-summary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChevronRight className="disclosure-chevron" size={15} />
        {summary}
      </button>
      <div className="disclosure-panel" inert={!open}>
        <div className="disclosure-inner">{children}</div>
      </div>
    </div>
  )
}
