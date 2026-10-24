import { useState, type CSSProperties } from 'react'
import { CircleHelp, FileText, ShieldCheck } from 'lucide-react'
import type { Answer, Citation } from '../../api/types'
import { Markdown } from '../../components/Markdown'
import { cx } from '../../lib/cx'
import { Badge } from '../../ui'
import { RetrievalInsights } from './RetrievalInsights'
import { ScoreMeter } from './ScoreMeter'
import './retrieval.css'

/**
 * A grounded answer: markdown body where [n] markers become citation chips, then the
 * numbered sources. Hovering a chip highlights its source and vice versa.
 */
export function AnswerView({ answer }: { answer: Answer }) {
  const [active, setActive] = useState<number | null>(null)
  const byNumber = new Map(answer.citations.map((c) => [c.number, c]))
  const scoreType = answer.retrieval?.scoreType
  const maxScore = Math.max(0, ...answer.citations.map((c) => c.score))
  // [1] or [1, 2] -> links the markdown renderer turns into chips
  const body = answer.answer.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, nums: string) =>
    nums
      .split(',')
      .map((n) => `[${n.trim()}](#cite-${n.trim()})`)
      .join(''),
  )

  return (
    <div className="answer">
      <div className="answer-status">
        {answer.grounded ? (
          <Badge tone="success" icon={<ShieldCheck />}>
            Grounded in {answer.citations.length} source{answer.citations.length === 1 ? '' : 's'}
          </Badge>
        ) : (
          <Badge tone="warning" icon={<CircleHelp />}>
            Not found in the knowledge base
          </Badge>
        )}
      </div>
      <Markdown
        className="answer-body"
        components={{
          a: ({ href, children }) => {
            const n = href?.startsWith('#cite-') ? Number(href.slice(6)) : NaN
            if (Number.isNaN(n)) return <a href={href} target="_blank" rel="noreferrer">{children}</a>
            const citation = byNumber.get(n)
            return (
              <button
                type="button"
                className={cx('cite-chip', active === n && 'is-active', !citation && 'is-missing')}
                title={citation ? citationLabel(citation) : 'Source not returned'}
                onMouseEnter={() => setActive(n)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(n)}
                onBlur={() => setActive(null)}
              >
                {n}
              </button>
            )
          },
        }}
      >
        {body}
      </Markdown>
      {answer.citations.length > 0 && (
        <ol className="citations stagger">
          {answer.citations.map((c, i) => (
            <li
              key={c.chunkId}
              className={cx('citation', active === c.number && 'is-active')}
              style={{ '--i': i } as CSSProperties}
              onMouseEnter={() => setActive(c.number)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="citation-number">{c.number}</span>
              <FileText size={14} className="muted" />
              <div className="grow">
                <div className="truncate citation-source">{c.source}</div>
                {(c.title || c.page != null) && (
                  <div className="xsmall muted truncate">
                    {[c.title, c.page != null ? `page ${c.page}` : null].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <ScoreMeter score={c.score} type={scoreType} max={maxScore} />
            </li>
          ))}
        </ol>
      )}
      <RetrievalInsights applied={answer.retrieval} warnings={answer.warnings} explain={answer.explain} />
    </div>
  )
}

function citationLabel(c: Citation): string {
  return [c.source, c.title, c.page != null ? `p. ${c.page}` : null].filter(Boolean).join(' · ')
}
