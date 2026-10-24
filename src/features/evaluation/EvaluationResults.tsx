import { useMemo, type CSSProperties } from 'react'
import { Crown, TriangleAlert } from 'lucide-react'
import type { EvaluationConfigResult, EvaluationReport } from '../../api/types'
import { cx } from '../../lib/cx'
import { Badge, Card, CardHeader, CopyButton, Disclosure } from '../../ui'

type Metric = 'hitRate' | 'recall' | 'mrr'

const METRICS: { key: Metric; label: string }[] = [
  { key: 'hitRate', label: 'hit@k' },
  { key: 'recall', label: 'recall@k' },
  { key: 'mrr', label: 'MRR' },
]

/** Report table: quality metrics with bars and deltas vs. the baseline, latency, cost and failures. */
export function EvaluationResults({ report, stale }: { report: EvaluationReport; stale: boolean }) {
  const best = useMemo(() => {
    const top = (pick: (r: EvaluationConfigResult) => number, lowerIsBetter = false) => {
      const values = report.results.map(pick)
      return lowerIsBetter ? Math.min(...values) : Math.max(...values)
    }
    return { hitRate: top((r) => r.hitRate), recall: top((r) => r.recall), mrr: top((r) => r.mrr), p50: top((r) => r.latencyP50Ms, true) }
  }, [report])

  return (
    <div className={cx('stack', stale && 'eval-stale')}>
      <Card padded={false}>
        <CardHeader
          title={`Golden set “${report.goldenSet}”`}
          description={`${report.questions} questions · k=${report.k} · baseline ${report.baseline}${report.seeded ? ` · ${report.seeded} corpus files ingested` : ''}`}
          actions={<CopyButton text={toMarkdown(report)} label="Markdown" size="sm" />}
        />
        <div className="table-scroll">
          <table className="eval-table">
            <thead>
              <tr>
                <th>Configuration</th>
                {METRICS.map((m) => (
                  <th key={m.key}>{m.label}</th>
                ))}
                <th className="num">p50</th>
                <th className="num">p95</th>
                <th className="num">LLM calls</th>
                <th className="num">Issues</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {report.results.map((r, i) => (
                <tr key={r.configuration} className={r.delta == null ? 'is-baseline' : undefined} style={{ '--i': i } as CSSProperties}>
                  <td>
                    <span className="mono eval-config">{r.configuration}</span>
                    {r.delta == null && <Badge>baseline</Badge>}
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.key}>
                      <MetricCell value={r[m.key]} delta={r.delta?.[m.key]} best={r[m.key] === best[m.key]} />
                    </td>
                  ))}
                  <td className="num">
                    <span className={cx(r.latencyP50Ms === best.p50 && 'eval-best')}>{r.latencyP50Ms} ms</span>
                    {r.delta && <Delta value={r.delta.latencyP50Ms} unit=" ms" lowerIsBetter />}
                  </td>
                  <td className="num muted">{r.latencyP95Ms} ms</td>
                  <td className="num">{r.avgLlmCalls.toFixed(1)}</td>
                  <td className="num">
                    {r.errors + r.degraded === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className="cluster" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        {r.errors > 0 && <Badge tone="danger">{r.errors} failed</Badge>}
                        {r.degraded > 0 && <Badge tone="warning" icon={<TriangleAlert />}>{r.degraded} degraded</Badge>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {report.results.some((r) => r.perQuestion?.length) && (
        <Card>
          <CardHeader title="Per question" description="Misses list the sources that ranked instead, to help diagnose them." />
          <div className="stack">
            {report.results.map(
              (r) =>
                r.perQuestion && (
                  <Disclosure key={r.configuration} summary={<span className="mono">{r.configuration}</span>}>
                    <div className="table-scroll">
                      <table className="eval-table eval-table-compact">
                        <thead>
                          <tr>
                            <th>Question</th>
                            <th className="num">Hit</th>
                            <th className="num">Recall</th>
                            <th className="num">RR</th>
                            <th className="num">Latency</th>
                            <th>Top sources</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.perQuestion.map((q) => (
                            <tr key={q.id} className={q.hit === 0 ? 'is-miss' : undefined}>
                              <td className="mono">{q.id}</td>
                              <td className="num">{q.hit ? '✓' : '✗'}</td>
                              <td className="num">{q.recall.toFixed(2)}</td>
                              <td className="num">{q.reciprocalRank.toFixed(2)}</td>
                              <td className="num">{q.latencyMs} ms</td>
                              <td className="xsmall subtle">{q.error ? <span className="eval-error">{q.error}</span> : q.topSources.join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Disclosure>
                ),
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function MetricCell({ value, delta, best }: { value: number; delta?: number; best: boolean }) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span className={cx('metric-value', best && 'eval-best')}>
          {best && <Crown size={11} />}
          {value.toFixed(3)}
        </span>
        {delta != null && <Delta value={delta} />}
      </div>
      <span className="metric-track">
        <span style={{ '--pct': `${Math.round(value * 100)}%` } as CSSProperties} />
      </span>
    </div>
  )
}

function Delta({ value, unit = '', lowerIsBetter = false }: { value: number; unit?: string; lowerIsBetter?: boolean }) {
  if (value === 0) return <span className="delta">±0{unit}</span>
  const good = lowerIsBetter ? value < 0 : value > 0
  const text = unit ? `${value > 0 ? '+' : ''}${value}${unit}` : `${value > 0 ? '+' : ''}${value.toFixed(3)}`
  return <span className={cx('delta', good ? 'is-good' : 'is-bad')}>{text}</span>
}

/** Same table as the backend's EvaluationReport.toMarkdown(). */
function toMarkdown(report: EvaluationReport): string {
  const d = (v?: number) => (v == null ? 'baseline' : `${v >= 0 ? '+' : ''}${v.toFixed(3)}`)
  const rows = report.results.map(
    (r) =>
      `| ${r.configuration} | ${r.hitRate.toFixed(3)} | ${r.recall.toFixed(3)} | ${r.mrr.toFixed(3)} | ${d(r.delta?.hitRate)} | ${d(r.delta?.recall)} | ${d(r.delta?.mrr)} | ${r.latencyP50Ms} | ${r.latencyP95Ms} | ${r.avgLlmCalls.toFixed(1)} | ${r.errors} | ${r.degraded} |`,
  )
  return [
    `Golden set ${report.goldenSet}: ${report.questions} questions, k=${report.k}, baseline=${report.baseline}`,
    '',
    '| configuration | hit@k | recall@k | MRR | Δ hit | Δ recall | Δ MRR | p50 ms | p95 ms | LLM calls | errors | degraded |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n')
}
