import { useEffect, useState, type FormEvent } from 'react'
import { FlaskConical, Play, Plus, Timer } from 'lucide-react'
import { api } from '../../api/client'
import type { EvaluationReport, RetrievalCatalog } from '../../api/types'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'
import { useAction, usePersistentState } from '../../lib/hooks'
import { Alert, Button, Card, CardHeader, Chip, EmptyState, Field, PageHeader, ProgressBar, Slider, Switch, TagInput, useToast } from '../../ui'
import { useRetrievalCatalog } from '../retrieval/catalog'
import { EvaluationResults } from './EvaluationResults'
import './evaluation.css'

interface EvalForm {
  configurations: string[]
  k: number
  seedCorpus: boolean
  details: boolean
}

const DEFAULT_FORM: EvalForm = { configurations: [], k: 5, seedCorpus: true, details: false }

export function EvaluationPage() {
  const [form, setForm] = usePersistentState<EvalForm>('eval.form', DEFAULT_FORM)
  const [report, setReport] = usePersistentState<EvaluationReport | null>('eval.report', null)
  const catalog = useRetrievalCatalog()
  const toast = useToast()
  const set = (patch: Partial<EvalForm>) => setForm((f) => ({ ...DEFAULT_FORM, ...f, ...patch }))
  const values = { ...DEFAULT_FORM, ...form }

  const evaluate = useAction(async () => {
    const result = await api.admin.evaluate({
      configurations: values.configurations.length ? values.configurations : undefined,
      k: values.k,
      seedCorpus: values.seedCorpus,
      details: values.details,
    })
    setReport(result)
    toast.success('Evaluation finished', `${result.results.length} configurations on ${result.questions} questions`)
    return result
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    evaluate.run()
  }

  const suggestions = catalog.data ? suggestedSpecs(catalog.data).filter((s) => !values.configurations.includes(s)) : []

  return (
    <>
      <PageHeader
        icon={<FlaskConical />}
        title="Retrieval evaluation"
        description="Measure retrieval strategies against the golden question set: hit rate, recall, MRR and latency, each compared with the baseline."
      />

      <div className="eval-layout">
        <Card className="eval-form-card">
          <CardHeader title="Run" description="Synchronous: LLM-heavy configurations can take minutes." />
          <form className="stack" onSubmit={submit}>
            <Field
              label="Configurations"
              hint={
                values.configurations.length
                  ? <>The first one, <span className="mono">{values.configurations[0]}</span>, is the baseline.</>
                  : 'Leave empty for the server defaults: every technique alone plus key combinations, baseline semantic.'
              }
            >
              <TagInput
                value={values.configurations}
                onChange={(configurations) => set({ configurations })}
                placeholder="e.g. hybrid+rerank:llm+mmr"
                className="mono"
              />
            </Field>
            {suggestions.length > 0 && (
              <div className="eval-suggestions">
                {suggestions.map((s) => (
                  <Chip key={s} onClick={() => set({ configurations: [...values.configurations, s] })}>
                    <Plus size={12} />
                    <span className="mono">{s}</span>
                  </Chip>
                ))}
              </div>
            )}
            <p className="xsmall muted">
              Format: <span className="mono">&lt;mode&gt;[+&lt;transform&gt;][+rerank:&lt;type&gt;][+mmr]</span>
            </p>
            <Field label="Cutoff (k)" hint="hit@k, recall@k and MRR count the top k results">
              <Slider min={1} max={20} value={values.k} onChange={(k) => set({ k })} />
            </Field>
            <Field hint="Ingests the bundled sample corpus first; already-present files are skipped.">
              <Switch checked={values.seedCorpus} onChange={(seedCorpus) => set({ seedCorpus })} label="Seed sample corpus" />
            </Field>
            <Field hint="Adds per-question hits, ranks and top sources.">
              <Switch checked={values.details} onChange={(details) => set({ details })} label="Per-question details" />
            </Field>
            <ApiErrorAlert error={evaluate.error} onDismiss={evaluate.clearError} />
            <Button type="submit" variant="primary" icon={<Play />} loading={evaluate.busy} block>
              {evaluate.busy ? 'Evaluating…' : 'Run evaluation'}
            </Button>
          </form>
        </Card>

        <section className="eval-results">
          {evaluate.busy && <RunningCard />}
          {report ? (
            <EvaluationResults report={report} stale={evaluate.busy} />
          ) : (
            !evaluate.busy && (
              <Card>
                <EmptyState
                  icon={<FlaskConical />}
                  title="No evaluation yet"
                  description="Run one to compare retrieval strategies. The last report is kept in this browser."
                />
              </Card>
            )
          )}
        </section>
      </div>
    </>
  )
}

function RunningCard() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <Alert tone="accent" title="Evaluation running" action={<span className="eval-timer"><Timer size={14} /> {formatElapsed(seconds)}</span>}>
      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
        Each configuration searches every golden question. Keep this tab open.
        <ProgressBar />
      </div>
    </Alert>
  )
}

const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** One spec per available technique on top of a sensible base, skipping unavailable options. */
function suggestedSpecs(catalog: RetrievalCatalog): string[] {
  const on = (list: RetrievalCatalog['mode'], value: string) => list.some((o) => o.value === value && o.enabled)
  const specs = catalog.mode.filter((o) => o.enabled).map((o) => o.value.toLowerCase())
  for (const t of catalog.queryTransform) if (t.enabled && t.value !== 'NONE') specs.push(`semantic+${t.value.toLowerCase()}`)
  for (const r of catalog.rerank) if (r.enabled && r.value !== 'NONE') specs.push(`hybrid+rerank:${r.value.toLowerCase()}`)
  if (on(catalog.diversify, 'MMR')) specs.push('hybrid+mmr')
  if (on(catalog.rerank, 'LLM') && on(catalog.diversify, 'MMR')) specs.push('hybrid+rerank:llm+mmr')
  return specs
}
