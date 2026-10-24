import type { CSSProperties } from 'react'
import { Activity, Sparkles } from 'lucide-react'
import type { AppliedRetrieval, RetrievalExplanation } from '../../api/types'
import { Alert, Badge, Disclosure } from '../../ui'
import { optionLabel } from './catalog'
import { SCORE_SCALES } from './scores'
import './retrieval.css'

interface RetrievalInsightsProps {
  applied?: AppliedRetrieval | null
  warnings?: string[]
  explain?: RetrievalExplanation
  /** client-measured round trip, when known */
  elapsedMs?: number
  /** start with the explain timeline expanded */
  explainOpen?: boolean
}

/** What actually ran, what degraded and why, and (with explain) each stage's queries and timing. */
export function RetrievalInsights({ applied, warnings = [], explain, elapsedMs, explainOpen = false }: RetrievalInsightsProps) {
  if (!applied && warnings.length === 0 && !explain) return null
  return (
    <div className="insights">
      {applied && <AppliedChips applied={applied} elapsedMs={elapsedMs} />}
      {warnings.map((w) => (
        <Alert key={w} tone="warning" title="A requested stage was skipped">
          {w}
        </Alert>
      ))}
      {explain && (
        <Disclosure summary={<><Activity size={14} /> How these results were ranked</>} defaultOpen={explainOpen}>
          <ExplainTimeline explain={explain} />
        </Disclosure>
      )}
    </div>
  )
}

export function AppliedChips({ applied, elapsedMs }: { applied: AppliedRetrieval; elapsedMs?: number }) {
  const steps = [
    optionLabel(applied.mode),
    applied.queryTransform !== 'NONE' && optionLabel(applied.queryTransform),
    applied.rerank !== 'NONE' && `rerank ${optionLabel(applied.rerank)}`,
    applied.diversify !== 'NONE' && `${optionLabel(applied.diversify)} λ ${applied.mmrLambda ?? ''}`.trim(),
  ].filter(Boolean) as string[]

  return (
    <div className="applied" aria-label="Retrieval that ran">
      <span className="applied-pipeline">
        {steps.map((s, i) => (
          <span key={s} className="applied-step" style={{ '--i': i } as CSSProperties}>
            {s}
          </span>
        ))}
      </span>
      <span className="applied-meta">
        top {applied.topK}
        {applied.candidates > applied.topK && ` of ${applied.candidates}`}
        {applied.keywordEngine && ` · ${optionLabel(applied.keywordEngine)}`}
        {applied.rrfK != null && ` · RRF k=${applied.rrfK}`}
      </span>
      <Badge variant="outline" title={SCORE_SCALES[applied.scoreType].description}>
        scores: {SCORE_SCALES[applied.scoreType].label}
      </Badge>
      {applied.llmCalls > 0 && (
        <Badge tone="accent" icon={<Sparkles />}>
          {applied.llmCalls} LLM call{applied.llmCalls === 1 ? '' : 's'}
        </Badge>
      )}
      {elapsedMs != null && <span className="applied-meta">{elapsedMs} ms</span>}
    </div>
  )
}

function ExplainTimeline({ explain }: { explain: RetrievalExplanation }) {
  const longest = Math.max(1, ...explain.stages.map((s) => s.durationMs))
  const rewritten = (queries: string[]) => queries.length > 1 || (queries[0] ?? explain.originalQuery) !== explain.originalQuery

  return (
    <div className="explain">
      {(rewritten(explain.semanticQueries) || rewritten(explain.keywordQueries)) && (
        <div className="explain-queries">
          <QueryList label="Semantic searched" queries={explain.semanticQueries} />
          <QueryList label="Keyword searched" queries={explain.keywordQueries} />
        </div>
      )}
      <ol className="explain-stages stagger">
        {explain.stages.map((stage, i) => (
          <li key={`${stage.name}-${i}`} className="explain-stage" style={{ '--i': i } as CSSProperties}>
            <span className="explain-stage-name mono">{stage.name}</span>
            <span className="explain-bar" title={`${stage.durationMs} ms`}>
              <span style={{ '--pct': `${Math.max(2, (stage.durationMs / longest) * 100)}%` } as CSSProperties} />
            </span>
            <span className="explain-stage-meta">
              {stage.candidates} · {stage.durationMs} ms
            </span>
            {stage.detail && <span className="explain-stage-detail">{stage.detail}</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

function QueryList({ label, queries }: { label: string; queries: string[] }) {
  if (queries.length === 0) return null
  return (
    <div>
      <div className="xsmall muted explain-label">{label}</div>
      <ul className="explain-query-list">
        {queries.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
    </div>
  )
}
