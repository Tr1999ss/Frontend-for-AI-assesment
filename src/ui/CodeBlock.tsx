import { useMemo, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { CopyButton } from './CopyButton'
import './code-block.css'

export interface CodeBlockProps {
  /** strings are shown as-is; anything else is pretty-printed JSON */
  value: unknown
  label?: ReactNode
  maxHeight?: number | string
  className?: string
}

export function CodeBlock({ value, label, maxHeight = 420, className }: CodeBlockProps) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  const isJson = typeof value !== 'string'
  const highlighted = useMemo(() => (isJson ? highlightJson(text) : text), [isJson, text])

  return (
    <div className={cx('code-block', className)}>
      <div className="code-block-bar">
        <span className="code-block-label">{label ?? (isJson ? 'JSON' : 'Text')}</span>
        <CopyButton text={text} />
      </div>
      <pre className="code-block-pre" style={{ maxHeight }}>
        <code>{highlighted}</code>
      </pre>
    </div>
  )
}

const TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

function highlightJson(json: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const match of json.matchAll(TOKEN)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > last) out.push(json.slice(last, start))
    const kind = token.startsWith('"') ? (token.trimEnd().endsWith(':') ? 'key' : 'string') : /^[tfn]/.test(token) ? 'literal' : 'number'
    out.push(
      <span key={start} className={`tok-${kind}`}>
        {token}
      </span>,
    )
    last = start + token.length
  }
  out.push(json.slice(last))
  return out
}
