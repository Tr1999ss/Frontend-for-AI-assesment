import { describe, expect, it } from 'vitest'
import { armSummary } from '../../test/fixtures'
import { ALL_METRICS, barWidths, formatJudge, formatUsd, judgeTone, teamChange, winner } from './raceMetrics'

const metric = (key: string) => ALL_METRICS.find((m) => m.key === key)!

describe('race metrics', () => {
  const single = armSummary('single', { medianLatencyMs: 2000, avgCostUsd: 0.0002, avgJudgeScore: 3.5, factPresenceRate: 0.6 })
  const team = armSummary('team', { medianLatencyMs: 5000, avgCostUsd: 0.0005, avgJudgeScore: 4.2, factPresenceRate: 0.6 })

  it('picks the lower value for latency and cost, the higher for quality', () => {
    expect(winner(metric('median'), single, team)).toBe('single')
    expect(winner(metric('cost'), single, team)).toBe('single')
    expect(winner(metric('judge'), single, team)).toBe('team')
  })

  it('calls values that display the same a tie', () => {
    expect(winner(metric('facts'), single, team)).toBe('tie')
    expect(winner(metric('cost'), single, armSummary('team', { avgCostUsd: 0.000201 }))).toBe('tie')
  })

  it('reports team change relative to single, except for fixed-scale metrics', () => {
    expect(teamChange(metric('median'), single, team)).toBe('+150%')
    expect(teamChange(metric('judge'), single, team)).toBeNull()
    expect(teamChange(metric('median'), armSummary('single', { medianLatencyMs: 0 }), team)).toBeNull()
  })

  it('scales bars to the larger arm, or to the fixed maximum', () => {
    expect(barWidths(metric('median'), single, team)).toEqual([40, 100])
    expect(barWidths(metric('judge'), single, team)).toEqual([70, 84])
    expect(barWidths(metric('median'), armSummary('single', { medianLatencyMs: 0 }), armSummary('team', { medianLatencyMs: 0 }))).toEqual([0, 0])
  })

  it('formats unjudged scores and small costs readably', () => {
    expect(formatJudge(0)).toBe('—')
    expect(formatJudge(4.25)).toBe('4.25')
    expect(formatUsd(0.000123)).toBe('$0.00012')
    expect(formatUsd(0)).toBe('$0')
    expect(judgeTone(0)).toBe('neutral')
    expect(judgeTone(5)).toBe('success')
    expect(judgeTone(3)).toBe('warning')
    expect(judgeTone(1)).toBe('danger')
  })
})
