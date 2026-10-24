import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowUp, Bot, User } from 'lucide-react'
import { cx } from '../../lib/cx'
import { Button, Textarea } from '../../ui'
import './conversation.css'

/** Full-height column: scrolling thread on top, composer pinned at the bottom. */
export function ConversationLayout({ header, children, composer }: { header?: ReactNode; children: ReactNode; composer: ReactNode }) {
  return (
    <div className="conversation">
      {header && <div className="conversation-header">{header}</div>}
      {children}
      <div className="conversation-composer">{composer}</div>
    </div>
  )
}

/** Scroll container that follows new messages unless the reader has scrolled up. */
export function Thread({ children, follow }: { children: ReactNode; follow: unknown }) {
  const ref = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)

  useEffect(() => {
    const el = ref.current
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [follow])

  return (
    <div
      ref={ref}
      className="thread"
      onScroll={(e) => {
        const el = e.currentTarget
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
    >
      <div className="thread-inner">{children}</div>
    </div>
  )
}

export function Message({ role, children, actions }: { role: 'user' | 'assistant'; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cx('message', `message-${role}`)}>
      <span className="message-avatar" aria-hidden>
        {role === 'user' ? <User size={15} /> : <Bot size={15} />}
      </span>
      <div className="message-body">
        {children}
        {actions && <div className="message-actions">{actions}</div>}
      </div>
    </div>
  )
}

export function TypingIndicator({ label }: { label?: ReactNode }) {
  return (
    <span className="typing" role="status">
      <span className="typing-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {label && <span className="typing-label">{label}</span>}
    </span>
  )
}

export interface ComposerProps {
  onSend: (text: string) => void
  busy?: boolean
  placeholder?: string
  /** extra controls left of the send button (filters, attachments) */
  tools?: ReactNode
  footnote?: ReactNode
}

/** Enter sends, Shift+Enter adds a line. */
export function Composer({ onSend, busy = false, placeholder = 'Type a message…', tools, footnote }: ComposerProps) {
  const [text, setText] = useState('')

  const send = (e?: FormEvent) => {
    e?.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    onSend(value)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e)
  }

  return (
    <form className="composer" onSubmit={send}>
      <div className="composer-box">
        <Textarea
          autoGrow
          maxRows={8}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="composer-input"
        />
        <div className="composer-bar">
          <div className="composer-tools">{tools}</div>
          <Button type="submit" variant="primary" size="sm" icon={<ArrowUp />} loading={busy} disabled={!text.trim()} aria-label="Send" />
        </div>
      </div>
      {footnote && <div className="composer-footnote">{footnote}</div>}
    </form>
  )
}

export function Suggestions({ items, onPick }: { items: string[]; onPick: (text: string) => void }) {
  return (
    <div className="suggestions stagger">
      {items.map((item, i) => (
        <button key={item} type="button" className="suggestion" style={{ ['--i' as string]: i }} onClick={() => onPick(item)}>
          {item}
        </button>
      ))}
    </div>
  )
}
