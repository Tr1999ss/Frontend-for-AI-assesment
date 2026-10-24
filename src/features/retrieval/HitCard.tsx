import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { BookOpen, FileText, Star } from 'lucide-react'
import type { SearchHit } from '../../api/types'
import { cx } from '../../lib/cx'
import { CopyButton, Tag } from '../../ui'
import { HitTrace } from './HitTrace'
import { ScoreMeter } from './ScoreMeter'
import './retrieval.css'

const PREVIEW_CHARS = 420

interface HitCardProps {
  hit: SearchHit
  rank: number
  query?: string
  index?: number
  /** best score in the list, for scaling unbounded score types */
  maxScore?: number
}

/** One matching passage: source, section, score, categories, the passage with query terms marked, and its trace. */
export function HitCard({ hit, rank, query, index = 0, maxScore }: HitCardProps) {
  const [expanded, setExpanded] = useState(false)
  const long = hit.text.length > PREVIEW_CHARS
  const text = expanded || !long ? hit.text : `${hit.text.slice(0, PREVIEW_CHARS).trimEnd()}…`
  const body = useMemo(() => highlight(text, query), [text, query])

  return (
    <article className="hit" style={{ '--i': Math.min(index, 12) } as CSSProperties}>
      <header className="hit-head">
        <span className="hit-rank">{rank}</span>
        <div className="grow">
          <div className="hit-source">
            <FileText size={14} />
            <span className="truncate">{hit.source}</span>
            {hit.page != null && <span className="hit-page">p. {hit.page}</span>}
          </div>
          {hit.title && (
            <div className="hit-section">
              <BookOpen size={12} />
              <span className="truncate">{hit.title}</span>
            </div>
          )}
        </div>
        <ScoreMeter score={hit.score} type={hit.scoreType} max={maxScore} />
      </header>
      <p className={cx('hit-text', long && !expanded && 'is-clipped')}>{body}</p>
      {hit.trace && hit.trace.length > 0 && <HitTrace trace={hit.trace} />}
      <footer className="hit-foot">
        <div className="cluster" style={{ gap: 4 }}>
          {hit.categories.map((c) => (
            <Tag key={c} emphasis={c === hit.primaryCategory}>
              {c === hit.primaryCategory && <Star size={10} fill="currentColor" />}
              {c}
            </Tag>
          ))}
          <span className="xsmall muted">chunk #{hit.chunkIndex}</span>
        </div>
        <div className="cluster" style={{ gap: 2 }}>
          {long && (
            <button type="button" className="link-button small" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          <CopyButton text={hit.text} title="Copy passage" />
        </div>
      </footer>
    </article>
  )
}

/** Wraps whole-word query terms (3+ letters) in <mark>. */
function highlight(text: string, query?: string): ReactNode {
  const terms = (query ?? '')
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 3)
  if (!terms.length) return text
  const pattern = new RegExp(`\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\w*`, 'gi')
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > last) parts.push(text.slice(last, start))
    parts.push(<mark key={start}>{match[0]}</mark>)
    last = start + match[0].length
  }
  parts.push(text.slice(last))
  return parts
}
