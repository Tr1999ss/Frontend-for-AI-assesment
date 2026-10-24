import type { CSSProperties } from 'react'
import type { ScoreType } from '../../api/types'
import { cx } from '../../lib/cx'
import { formatScore, normalizeScore, SCORE_SCALES } from './scores'

interface ScoreMeterProps {
  score: number
  type?: ScoreType
  /** best score in the same list; scales unbounded types (RRF, BM25) */
  max?: number
  className?: string
}

/**
 * A score as a small bar plus its value. Bounded types fill by absolute value; unbounded ones
 * relative to the list's best hit, so the bar never suggests RRF 0.03 means "3% relevant".
 */
export function ScoreMeter({ score, type = 'COSINE', max, className }: ScoreMeterProps) {
  const scale = SCORE_SCALES[type]
  const fill = normalizeScore(score, type, max)
  const band = fill >= 0.75 ? 'high' : fill >= 0.5 ? 'mid' : 'low'
  const tip = `${scale.description}${scale.bounded ? '' : ' (bar relative to the top result)'}: ${score}`
  return (
    <span className={cx('score', `score-${band}`, className)} title={tip}>
      <span className="score-track">
        <span className="score-fill" style={{ '--pct': `${Math.round(fill * 100)}%` } as CSSProperties} />
      </span>
      <span className="score-value">{formatScore(score, type)}</span>
    </span>
  )
}
