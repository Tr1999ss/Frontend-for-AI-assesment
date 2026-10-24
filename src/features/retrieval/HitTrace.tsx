import { ChevronRight } from 'lucide-react'
import type { StageScore } from '../../api/types'
import { formatScore, SCORE_SCALES } from './scores'

/** A hit's rank and score at each pipeline stage, left to right. */
export function HitTrace({ trace }: { trace: StageScore[] }) {
  return (
    <ol className="trace" aria-label="Ranking trace">
      {trace.map((step, i) => (
        <li key={`${step.stage}-${i}`} className="trace-step" title={SCORE_SCALES[step.scoreType].description}>
          {i > 0 && <ChevronRight size={12} className="trace-arrow" />}
          <span className="trace-stage mono">{step.stage}</span>
          <span className="trace-rank">#{step.rank}</span>
          <span className="trace-score mono">{formatScore(step.score, step.scoreType)}</span>
        </li>
      ))}
    </ol>
  )
}
