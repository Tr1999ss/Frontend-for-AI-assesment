import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '../lib/cx'
import './field.css'

interface FieldContextValue {
  id: string
  describedBy?: string
  invalid: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** For custom controls inside a <Field>: returns the id and aria wiring the label expects. */
export function useFieldControl(): FieldContextValue | null {
  return useContext(FieldContext)
}

export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  /** right side of the label row: a counter, a type, a link */
  trailing?: ReactNode
  className?: string
  children: ReactNode
}

/** Label + control + hint/error. Controls inside pick up the id automatically. */
export function Field({ label, hint, error, required, trailing, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error || hint
  return (
    <FieldContext.Provider value={{ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) }}>
      <div className={cx('field', className)}>
        {(label || trailing) && (
          <div className="field-top">
            {label && (
              <label htmlFor={id} className="field-label">
                {label}
                {required && (
                  <span className="field-required" aria-hidden>
                    *
                  </span>
                )}
              </label>
            )}
            {trailing && <span className="field-trailing">{trailing}</span>}
          </div>
        )}
        {children}
        {message && (
          <p id={messageId} className={cx('field-message', error && 'is-error')}>
            {message}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  )
}

function useControlProps(id: string | undefined) {
  const field = useContext(FieldContext)
  return {
    id: id ?? field?.id,
    'aria-describedby': field?.describedBy,
    'aria-invalid': field?.invalid || undefined,
  }
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  trailing?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function Input({ icon, trailing, className, id, ...rest }: InputProps) {
  const control = useControlProps(id)
  if (!icon && !trailing) return <input className={cx('control', className)} {...control} {...rest} />
  return (
    <div className={cx('control-wrap', icon && 'has-icon', trailing && 'has-trailing', className)}>
      {icon && <span className="control-icon">{icon}</span>}
      <input className="control" {...control} {...rest} />
      {trailing && <span className="control-trailing">{trailing}</span>}
    </div>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** grow with content up to maxRows */
  autoGrow?: boolean
  maxRows?: number
}

export function Textarea({ autoGrow = false, maxRows = 16, className, id, value, ...rest }: TextareaProps) {
  const control = useControlProps(id)
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!autoGrow || !el) return
    el.style.height = 'auto'
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20
    el.style.height = `${Math.min(el.scrollHeight + 2, lineHeight * maxRows)}px`
  }, [autoGrow, maxRows, value])

  return (
    <textarea
      ref={ref}
      className={cx('control', autoGrow && 'is-autogrow', className)}
      value={value}
      {...control}
      {...rest}
    />
  )
}

export function Select({ className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const control = useControlProps(id)
  return (
    <div className={cx('control-wrap', className)}>
      <select className="control" {...control} {...rest}>
        {children}
      </select>
      <ChevronDown className="select-chevron" size={16} aria-hidden />
    </div>
  )
}
