import { useState, type CSSProperties } from 'react'
import { Crown, TriangleAlert } from 'lucide-react'
import type { RaceArmSummary, RaceQuestionResult, RaceReport, RaceRunMetrics } from '../../api/types'
import { cx } from '../../lib/cx'
import { formatDuration } from '../../lib/format'
import { Badge, Card, CardHeader, CopyButton, Disclosure, EmptyState, Segmented } from '../../ui'
import {
  ALL_METRICS,
  barWidths,
  COST_METRICS,
  formatJudge,
  formatRate,
  formatTokens,
  formatUsd,
  judgeTone,
  QUALITY_METRICS,
  SPEED_METRICS,
  teamChange,
  winner,
  type ArmMetric,
} from './raceMetrics'

const ARM_LABEL = { single: 'Single', team: 'Team' } as const

export function RaceResults({ report, source, stale }: { report: RaceReport; source: string; stale: boolean }) {
  const when = new Date(report.timestamp)
  return (
    <div className={cx('stack', stale && 'race-stale')}>
      <Card padded={false}>
        <CardHeader
          title={
            <>
              {report.raceName} <Badge tone={source === 'This run' ? 'success' : 'neutral'}>{source}</Badge>
            </>
          }
          description={
            <>
              {report.totalQuestions} questions × {report.repetitions} repetitions · agent <span className="mono">{report.agentModel}</span> · judge{' '}
              <span className="mono">{report.judgeModel}</span> · <time dateTime={report.timestamp}>{when.toLocaleString()}</time>
            </>
          }
          actions={<CopyButton text={report.markdownTable} label="Markdown" size="sm" />}
        />
      </Card>

      <SummaryGroup title="Speed" metrics={SPEED_METRICS} single={report.overallSingle} team={report.overallTeam} />
      <SummaryGroup
        title="Tokens and cost"
        metrics={COST_METRICS}
        single={report.overallSingle}
        team={report.overallTeam}
        note={
          report.overallTeam.avgHandoffTokens > 0
            ? `Team tokens include ~${formatTokens(report.overallTeam.avgHandoffTokens)} hand-off tokens per query re-sent between agents.`
            : undefined
        }
      />
      <SummaryGroup title="Quality" metrics={QUALITY_METRICS} single={report.overallSingle} team={report.overallTeam} />

      <TypeTable report={report} />
      <QuestionDetails questions={report.questionResults} />
    </div>
  )
}

function SummaryGroup({
  title,
  metrics,
  single,
  team,
  note,
}: {
  title: string
  metrics: ArmMetric[]
  single: RaceArmSummary
  team: RaceArmSummary
  note?: string
}) {
  return (
    <section className="race-summary" aria-label={title}>
      <h2 className="race-summary-title">{title}</h2>
      <div className="race-summary-grid">
        {metrics.map((m) => (
          <SummaryCard key={m.key} metric={m} single={single} team={team} />
        ))}
      </div>
      {note && <p className="xsmall muted">{note}</p>}
    </section>
  )
}

function SummaryCard({ metric, single, team }: { metric: ArmMetric; single: RaceArmSummary; team: RaceArmSummary }) {
  const best = winner(metric, single, team)
  const change = teamChange(metric, single, team)
  const widths = barWidths(metric, single, team)
  return (
    <Card className="race-card">
      <div className="race-card-head">
        <h3 className="race-card-label">{metric.label}</h3>
        <WinnerBadge winner={best} />
      </div>
      <dl className="race-arms">
        {(['single', 'team'] as const).map((arm, i) => (
          <div key={arm} className={cx('race-arm', `is-${arm}`, best === arm && 'is-best')}>
            <dt>{ARM_LABEL[arm]}</dt>
            <dd>
              <span className="race-arm-value">{metric.format(metric.value(arm === 'single' ? single : team))}</span>
              <span className="race-bar" aria-hidden>
                <span style={{ '--pct': `${widths[i]}%` } as CSSProperties} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {change && <p className="xsmall muted race-change">Team {change} vs single</p>}
    </Card>
  )
}

function WinnerBadge({ winner }: { winner: 'single' | 'team' | 'tie' }) {
  if (winner === 'tie') return <Badge>Tie</Badge>
  return (
    <Badge tone="success" icon={<Crown />}>
      {ARM_LABEL[winner]}
    </Badge>
  )
}

function TypeTable({ report }: { report: RaceReport }) {
  const types = Object.values(report.byType)
  return (
    <Card padded={false}>
      <CardHeader title="By question type" description="Simple questions need one lookup; two-part and broad ones are where a team could help." />
      {types.length === 0 ? (
        <EmptyState compact title="No question types" description="This report has no per-type breakdown." />
      ) : (
        <div className="table-scroll">
          <table className="race-table">
            <caption className="sr-only">Single and team metrics per question type; the better value of each pair is marked.</caption>
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Agent</th>
                {ALL_METRICS.map((m) => (
                  <th key={m.key} scope="col" className="num">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) =>
                (['single', 'team'] as const).map((arm, i) => (
                  <tr key={`${t.type}-${arm}`} className={cx(i === 1 && 'race-pair-end')}>
                    {i === 0 && (
                      <th scope="rowgroup" rowSpan={2} className="race-type-cell">
                        <span className="race-type">{t.type}</span>
                        <span className="xsmall muted">
                          {t.questionCount} question{t.questionCount === 1 ? '' : 's'}
                        </span>
                      </th>
                    )}
                    <td>{ARM_LABEL[arm]}</td>
                    {ALL_METRICS.map((m) => {
                      const summary = arm === 'single' ? t.single : t.team
                      const best = winner(m, t.single, t.team) === arm
                      return (
                        <td key={m.key} className={cx('num', best && 'race-better')}>
                          {m.format(m.value(summary))}
                          {best && <span className="sr-only"> (better)</span>}
                        </td>
                      )
                    })}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function QuestionDetails({ questions }: { questions: RaceQuestionResult[] }) {
  const types = [...new Set(questions.map((q) => q.type))]
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? questions : questions.filter((q) => q.type === filter)
  return (
    <Card>
      <CardHeader
        title="Per question"
        description="Every repetition with its judge score and reason. Fact coverage and source recall are string matches against the expected answer."
        actions={
          types.length > 1 && (
            <Segmented
              size="sm"
              aria-label="Filter by question type"
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: 'All' }, ...types.map((t) => ({ value: t, label: t }))]}
            />
          )
        }
      />
      {shown.length === 0 ? (
        <EmptyState compact title="No questions" />
      ) : (
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          {shown.map((q) => (
            <Disclosure
              key={q.questionId}
              className="race-question"
              summary={
                <span className="race-question-summary">
                  <span className="mono race-qid">{q.questionId}</span>
                  <Badge variant="outline">{q.type}</Badge>
                  <span className="race-question-text">{q.question}</span>
                  <span className="race-question-scores xsmall">
                    judge <Badge tone={judgeTone(q.singleSummary.avgJudgeScore)}>S {formatJudge(q.singleSummary.avgJudgeScore)}</Badge>{' '}
                    <Badge tone={judgeTone(q.teamSummary.avgJudgeScore)}>T {formatJudge(q.teamSummary.avgJudgeScore)}</Badge>
                  </span>
                </span>
              }
            >
              <RunTable question={q} />
            </Disclosure>
          ))}
        </div>
      )}
    </Card>
  )
}

function RunTable({ question }: { question: RaceQuestionResult }) {
  const runs: { arm: 'single' | 'team'; run: RaceRunMetrics }[] = [
    ...question.singleRuns.map((run) => ({ arm: 'single' as const, run })),
    ...question.teamRuns.map((run) => ({ arm: 'team' as const, run })),
  ].sort((a, b) => a.run.repetition - b.run.repetition || a.arm.localeCompare(b.arm))
  return (
    <div className="table-scroll">
      <table className="race-table race-table-compact">
        <caption className="sr-only">Runs for {question.questionId}</caption>
        <thead>
          <tr>
            <th scope="col">Agent</th>
            <th scope="col" className="num">Rep</th>
            <th scope="col" className="num">Latency</th>
            <th scope="col" className="num">Tokens in / out</th>
            <th scope="col" className="num">Cost</th>
            <th scope="col" className="num">Facts</th>
            <th scope="col" className="num">Sources</th>
            <th scope="col" className="num">Judge</th>
            <th scope="col">Judge reason and answer</th>
          </tr>
        </thead>
        <tbody>
          {runs.map(({ arm, run }) => (
            <tr key={`${arm}-${run.repetition}`} className={cx(run.aborted && 'is-aborted')}>
              <td>
                {ARM_LABEL[arm]}
                {run.aborted && (
                  <Badge tone="danger" icon={<TriangleAlert />} className="race-aborted">
                    aborted
                  </Badge>
                )}
              </td>
              <td className="num">{run.repetition}</td>
              <td className="num">{formatDuration(run.latencyMs)}</td>
              <td className="num">
                {formatTokens(run.inputTokens)} / {formatTokens(run.outputTokens)}
              </td>
              <td className="num">{formatUsd(run.costUsd)}</td>
              <td className="num">{formatRate(run.factScore)}</td>
              <td className="num">{formatRate(run.sourceScore)}</td>
              <td className="num">
                <Badge tone={judgeTone(run.judgeScore)}>{run.judgeScore > 0 ? `${run.judgeScore}/5` : '—'}</Badge>
              </td>
              <td className="race-reason">
                <div>{run.judgeReason}</div>
                {run.answerSummary && <div className="xsmall muted race-answer">{run.answerSummary}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
