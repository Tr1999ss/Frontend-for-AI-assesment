import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import './popover.css'

export interface PopoverTriggerProps {
  'aria-expanded': boolean
  'aria-controls': string
  onClick: () => void
}

export interface PopoverProps {
  trigger: (props: PopoverTriggerProps) => ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}

/** Click-to-open panel anchored under its trigger; closes on outside press or Escape. */
export function Popover({ trigger, children, align = 'end', className }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="popover-anchor">
      {trigger({ 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((o) => !o) })}
      {open && (
        <div id={id} className={cx('popover', `popover-${align}`, className)} role="dialog">
          {children}
        </div>
      )}
    </div>
  )
}
