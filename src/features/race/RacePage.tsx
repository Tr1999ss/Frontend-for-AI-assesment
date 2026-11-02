import { useEffect, useState, type FormEvent } from 'react'
import { Ban, Play, RefreshCw, Timer, Trophy } from 'lucide-react'
import { api } from '../../api/client'
import type { RaceReport } from '../../api/types'
import { AuthErrorAlert } from '../../components/AuthErrorAlert'
import { usePersistentState, useResource } from '../../lib/hooks'
import { Alert, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, ProgressBar, Select, Skeleton, Switch, useToast } from '../../ui'
import { RaceResults } from './RaceResults'
import { useRaceRun } from './useRaceRun'
import './race.css'

interface RaceForm {
  /** kept as typed so the fields can be cleared while editing */
  repetitions: string
  limitQuestions: string
  timeoutMinutes: number
  useJudge: boolean
  seedCorpus: boolean
}

const DEFAULT_FORM: RaceForm = { repetitions: '3', limitQuestions: '', timeoutMinutes: 60, useJudge: true, seedCorpus: false }
const TIMEOUTS = [10, 30, 60, 120]
const MAX_REPETITIONS = 10

export function RacePage() {
  const [form, setForm] = usePersistentState<RaceForm>('race.form', DEFAULT_FORM)
  const values = { ...DEFAULT_FORM, ...form }
  const set = (patch: Partial<RaceForm>) => setForm((f) => ({ ...DEFAULT_FORM, ...f, ...patch }))
  const toast = useToast()

  const saved = useResource(() => api.admin.latestRace(), [])
  const [fresh, setFresh] = useState<RaceReport | null>(null)
  const race = useRaceRun((report) => {
    setFresh(report)
    toast.success('Race finished', `${report.totalQuestions} questions × ${report.repetitions} repetitions`)
  })
  const report = fresh ?? saved.data
  const reloadSaved = () => {
    setFresh(null)
    race.clear()
    saved.reload()
  }

  const repetitions = Number(values.repetitions)
  const repetitionsError =
    Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= MAX_REPETITIONS ? undefined : `A whole number from 1 to ${MAX_REPETITIONS}`
  const limit = values.limitQuestions.trim() === '' ? undefined : Number(values.limitQuestions)
  const limitError = limit === undefined || (Number.isInteger(limit) && limit >= 1) ? undefined : 'A whole number of at least 1, or empty for all'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (race.running || repetitionsError || limitError) return
    race.start(
      { repetitions, limitQuestions: limit, useJudge: values.useJudge, seedCorpus: values.seedCorpus },
      values.timeoutMinutes * 60_000,
    )
  }

  return (
    <>
      <PageHeader
        icon={<Trophy />}
        title="Agent race"
        description="One agent with tools against a manager with two specialists, on the same questions: latency, tokens, cost and answer quality."
        actions={
          <Button icon={<RefreshCw />} onClick={reloadSaved} disabled={race.running || saved.loading}>
            Load saved result
          </Button>
        }
      />

      <div className="race-layout">
        <Card className="race-form-card">
          <CardHeader title="Run" description="Both agents answer every question once per repetition, alternating. Expect several minutes." />
          <form className="stack" onSubmit={submit} noValidate>
            <Field label="Repetitions" hint="Runs per question and agent" error={repetitionsError} required>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_REPETITIONS}
                value={values.repetitions}
                onChange={(e) => set({ repetitions: e.target.value })}
                disabled={race.running}
              />
            </Field>
            <Field label="Question limit" hint="Only the first n questions; empty runs them all" error={limitError}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="All"
                value={values.limitQuestions}
                onChange={(e) => set({ limitQuestions: e.target.value })}
                disabled={race.running}
              />
            </Field>
            <Field label="Stop waiting after" hint="The browser gives up; the server still finishes and saves the race">
              <Select value={values.timeoutMinutes} onChange={(e) => set({ timeoutMinutes: Number(e.target.value) })} disabled={race.running}>
                {TIMEOUTS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </Select>
            </Field>
            <Field hint="Scores every answer 1–5 with a separate judge model. Costs extra calls.">
              <Switch checked={values.useJudge} onChange={(useJudge) => set({ useJudge })} label="LLM judge" disabled={race.running} />
            </Field>
            <Field hint="Ingests the race corpus first; files already present are skipped.">
              <Switch checked={values.seedCorpus} onChange={(seedCorpus) => set({ seedCorpus })} label="Seed corpus" disabled={race.running} />
            </Field>
            <AuthErrorAlert error={race.error} onDismiss={race.clear} />
            <Button type="submit" variant="primary" icon={<Play />} loading={race.running} disabled={Boolean(repetitionsError || limitError)} block>
              {race.running ? 'Racing…' : 'Run race'}
            </Button>
          </form>
        </Card>

        <section className="race-results" aria-label="Race results" aria-busy={race.running || saved.loading}>
          {race.running && race.startedAt != null && (
            <RunningAlert
              startedAt={race.startedAt}
              questions={limit}
              repetitions={repetitions}
              judged={values.useJudge}
              onCancel={race.cancel}
            />
          )}
          {race.stopped && (
            <Alert
              tone={race.stopped === 'timeout' ? 'warning' : 'info'}
              title={race.stopped === 'timeout' ? `Stopped waiting after ${values.timeoutMinutes} minutes` : 'Stopped waiting'}
              onDismiss={race.clear}
              action={
                <Button size="sm" icon={<RefreshCw />} onClick={reloadSaved}>
                  Load saved result
                </Button>
              }
            >
              The server keeps running the race and saves it when done. Load the saved result later.
            </Alert>
          )}
          <ResultsArea report={report} isFresh={fresh != null} saved={saved} stale={race.running} />
        </section>
      </div>
    </>
  )
}

function ResultsArea({
  report,
  isFresh,
  saved,
  stale,
}: {
  report: RaceReport | undefined
  isFresh: boolean
  saved: { loading: boolean; error: unknown; reload: () => void }
  stale: boolean
}) {
  if (report) return <RaceResults report={report} source={isFresh ? 'This run' : 'Last saved race'} stale={stale} />
  if (saved.loading) {
    return (
      <Card className="stack" aria-label="Loading the last saved race">
        <Skeleton width="40%" height={18} />
        <Skeleton height={80} />
        <Skeleton height={160} />
      </Card>
    )
  }
  if (saved.error) return <AuthErrorAlert error={saved.error} />
  if (stale) return null
  return (
    <Card>
      <EmptyState
        icon={<Trophy />}
        title="No race yet"
        description="Run one to compare the single agent with the agent team. The server keeps the last result."
      />
    </Card>
  )
}

function RunningAlert({
  startedAt,
  questions,
  repetitions,
  judged,
  onCancel,
}: {
  startedAt: number
  questions: number | undefined
  repetitions: number
  judged: boolean
  onCancel: () => void
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const scope = questions ? `${questions} question${questions === 1 ? '' : 's'}` : 'All questions'
  return (
    <Alert
      tone="accent"
      title="Race running"
      action={
        <span className="cluster">
          <span className="race-timer" role="timer" aria-label={`Elapsed ${formatElapsed(seconds)}`}>
            <Timer size={14} /> {formatElapsed(seconds)}
          </span>
          <Button size="sm" variant="secondary" icon={<Ban />} onClick={onCancel}>
            Cancel
          </Button>
        </span>
      }
    >
      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
        <span>
          {scope} × {repetitions} repetition{repetitions === 1 ? '' : 's'}, single and team alternating{judged ? ', each answer judged' : ''}.
          The server reports nothing until the whole race is done. Keep this page open.
        </span>
        <ProgressBar />
      </div>
    </Alert>
  )
}

const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
