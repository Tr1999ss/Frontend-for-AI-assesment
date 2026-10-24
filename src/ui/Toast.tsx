import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cx } from '../lib/cx'
import './toast.css'

export type ToastTone = 'success' | 'danger' | 'warning' | 'info'

export interface ToastOptions {
  tone?: ToastTone
  title: ReactNode
  description?: ReactNode
  /** ms; 0 keeps it until dismissed */
  duration?: number
}

type ToastItem = ToastOptions & {
  tone: ToastTone
  duration: number
  id: number
  leaving: boolean
}

interface ToastApi {
  show: (options: ToastOptions) => number
  success: (title: ReactNode, description?: ReactNode) => number
  error: (title: ReactNode, description?: ReactNode) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS = { success: CircleCheck, danger: CircleAlert, warning: TriangleAlert, info: Info }
const EXIT_MS = 220

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), EXIT_MS)
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      const toast: ToastItem = { tone: 'info', duration: 4500, ...options, id, leaving: false }
      setToasts((all) => [...all.slice(-4), toast])
      if (toast.duration > 0) setTimeout(() => dismiss(id), toast.duration)
      return id
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, description) => show({ tone: 'success', title, description }),
      error: (title, description) => show({ tone: 'danger', title, description, duration: 7000 }),
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-viewport" role="region" aria-label="Notifications" aria-live="polite">
          {toasts.map((t) => {
            const Icon = ICONS[t.tone]
            return (
              <div key={t.id} className={cx('toast', `toast-${t.tone}`, t.leaving && 'is-leaving')} role="status">
                <Icon className="toast-icon" size={18} />
                <div className="grow">
                  <div className="toast-title">{t.title}</div>
                  {t.description && <div className="toast-description">{t.description}</div>}
                </div>
                <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
