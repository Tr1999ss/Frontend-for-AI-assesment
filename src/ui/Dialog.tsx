import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/cx'
import { Button } from './Button'
import './dialog.css'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  footer?: ReactNode
  /** 'sheet' slides in from the right edge */
  variant?: 'modal' | 'sheet'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: ReactNode
}

/**
 * Built on native <dialog>: focus trapping, Escape and the top layer come from the browser.
 * Closing plays an exit animation before the element actually closes.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  icon,
  footer,
  variant = 'modal',
  size = 'md',
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      delete dialog.dataset.closing
      dialog.showModal()
      return
    }
    if (!open && dialog.open) {
      dialog.dataset.closing = ''
      const finish = () => {
        clearTimeout(fallback)
        dialog.removeEventListener('animationend', onEnd)
        delete dialog.dataset.closing
        dialog.close()
      }
      const onEnd = (e: AnimationEvent) => e.target === dialog && finish()
      const fallback = setTimeout(finish, 400)
      dialog.addEventListener('animationend', onEnd)
      return () => {
        clearTimeout(fallback)
        dialog.removeEventListener('animationend', onEnd)
      }
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx('dialog', `dialog-${variant}`, `dialog-${size}`, className)}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => {
        // a press on the backdrop lands on the <dialog> element itself
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {(title || description) && (
        <header className="dialog-header">
          {icon && <span className="dialog-icon">{icon}</span>}
          <div className="grow">
            {title && <h2 className="dialog-title">{title}</h2>}
            {description && <p className="dialog-description">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" icon={<X />} aria-label="Close" onClick={onClose} />
        </header>
      )}
      <div className="dialog-body">{children}</div>
      {footer && <footer className="dialog-footer">{footer}</footer>}
    </dialog>
  )
}
