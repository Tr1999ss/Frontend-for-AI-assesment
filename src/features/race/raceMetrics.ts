import type { RaceArmSummary } from '../../api/types'
import { formatDuration } from '../../lib/format'

export type Winner = 'single' | 'team' | 'tie'

export interface ArmMetric {
  key: string
  label: string
  value: (s: RaceArmSummary) => number
  format: (v: number) => string
  lowerIsBetter: boolean
  /** fixed scale for bars (rates, judge score); otherwise bars scale to the larger arm */
  max?: number
}

const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

export const formatTokens = (v: number) => integer.format(v)
export const formatUsd = (v: number) => (v === 0 ? '$0' : `$${v.toFixed(v < 1 ? 5 : 2)}`)
export const formatRate = (v: number) => `${(v * 100).toFixed(1)}%`
/** 0 means "not judged" (judge off, aborted run or blank answer) */
export const formatJudge = (v: number) => (v > 0 ? v.toFixed(2) : '—')

export const SPEED_METRICS: ArmMetric[] = [
  { key: 'median', label: 'Median latency', value: (s) => s.medianLatencyMs, format: formatDuration, lowerIsBetter: true },
  { key: 'p95', label: 'p95 latency', value: (s) => s.p95LatencyMs, format: formatDuration, lowerIsBetter: true },
]

export const COST_METRICS: ArmMetric[] = [
  { key: 'tokens', label: 'Avg tokens / query', value: (s) => s.avgTotalTokens, format: formatTokens, lowerIsBetter: true },
  { key: 'cost', label: 'Avg cost / query', value: (s) => s.avgCostUsd, format: formatUsd, lowerIsBetter: true },
]

export const QUALITY_METRICS: ArmMetric[] = [
  { key: 'judge', label: 'Judge score (1–5)', value: (s) => s.avgJudgeScore, format: formatJudge, lowerIsBetter: false, max: 5 },
  { key: 'facts', label: 'Fact coverage', value: (s) => s.factPresenceRate, format: formatRate, lowerIsBetter: false, max: 1 },
  { key: 'sources', label: 'Source recall', value: (s) => s.sourceRecallRate, format: formatRate, lowerIsBetter: false, max: 1 },
]

export const ALL_METRICS = [...SPEED_METRICS, ...COST_METRICS, ...QUALITY_METRICS]

/** Better arm for one metric. Values that display the same are a tie, so the verdict matches what is shown. */
export function winner(metric: ArmMetric, single: RaceArmSummary, team: RaceArmSummary): Winner {
  const s = metric.value(single)
  const t = metric.value(team)
  if (metric.format(s) === metric.format(t)) return 'tie'
  return (metric.lowerIsBetter ? t < s : t > s) ? 'team' : 'single'
}

/** Team relative to Single, e.g. +34% or -12%; null when Single is 0 or the metric has a fixed scale. */
export function teamChange(metric: ArmMetric, single: RaceArmSummary, team: RaceArmSummary): string | null {
  const s = metric.value(single)
  const t = metric.value(team)
  if (metric.max != null || s === 0) return null
  const pct = Math.round(((t - s) / s) * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

/** Bar widths 0..100 for the two arms, on the metric's fixed scale or relative to the larger value. */
export function barWidths(metric: ArmMetric, single: RaceArmSummary, team: RaceArmSummary): [number, number] {
  const s = metric.value(single)
  const t = metric.value(team)
  const max = metric.max ?? Math.max(s, t)
  if (max <= 0) return [0, 0]
  return [Math.round((s / max) * 100), Math.round((t / max) * 100)]
}

/** Colour band for a 1..5 judge score; 0 (not judged) is neutral. */
export function judgeTone(score: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (score <= 0) return 'neutral'
  if (score >= 4) return 'success'
  if (score >= 3) return 'warning'
  return 'danger'
}
