import type { ScoreType } from '../../api/types'

interface ScoreScale {
  label: string
  description: string
  /** true when scores are already 0..1 and a bar can show them directly */
  bounded: boolean
  digits: number
}

/** Scores of different types are not comparable, so each type gets its own presentation. */
export const SCORE_SCALES: Record<ScoreType, ScoreScale> = {
  COSINE: { label: 'Cosine', description: 'Cosine similarity, 0 to 1', bounded: true, digits: 2 },
  FTS_RANK: { label: 'Full-text rank', description: 'Postgres full-text rank, normalized to 0 to 1', bounded: true, digits: 2 },
  BM25: { label: 'BM25', description: 'BM25 score, unbounded; higher is better', bounded: false, digits: 2 },
  RRF: { label: 'RRF', description: 'Reciprocal rank fusion, about 0.01 to 0.05', bounded: false, digits: 4 },
  RERANK: { label: 'Rerank', description: 'Reranker relevance, 0 to 1', bounded: true, digits: 2 },
}

/** 0..1 bar fill: bounded scores as-is, unbounded ones relative to the best score in the list. */
export function normalizeScore(score: number, type: ScoreType, max?: number): number {
  if (SCORE_SCALES[type].bounded) return clamp(score)
  return max && max > 0 ? clamp(score / max) : 1
}

export function formatScore(score: number, type: ScoreType): string {
  return score.toFixed(SCORE_SCALES[type].digits)
}

const clamp = (n: number) => Math.max(0, Math.min(1, n))
