import { useState } from 'react'
import { CircleAlert, CircleCheck, Eye, FileJson, Terminal } from 'lucide-react'
import { describeError } from '../../components/ApiErrorAlert'
import { cx } from '../../lib/cx'
import { timeAgo } from '../../lib/format'
import { Alert, Badge, Card, CardHeader, CodeBlock, EmptyState, Segmented, Spinner } from '../../ui'
import { resolveResultRenderer } from './results/registry'
import { parseContent } from './schema'
import type { ToolCallOutcome } from './useMcpConnection'

export interface ToolRun {
  id: string
  tool: string
  args: Record<string, unknown>
  startedAt: number
  durationMs?: number
  outcome?: ToolCallOutcome
  error?: unknown
}

/** Output of the selected run plus a strip of earlier runs to flip between. */
export function ToolOutput({ runs, selectedId, onSelect }: { runs: ToolRun[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const run = runs.find((r) => r.id === selectedId) ?? runs[0]

  return (
    <Card padded={false} className="tool-output">
      <CardHeader
        icon={<Terminal />}
        title="Output"
        description={run ? `${run.tool} · ${timeAgo(run.startedAt)}` : 'Run a tool to see its result'}
        actions={run && <RunBadge run={run} />}
      />
      {!run ? (
        <EmptyState icon={<Terminal />} title="No runs yet" description="Pick a tool, fill in its arguments and run it." />
      ) : (
        <div className="tool-output-body" key={run.id}>
          <RunResult run={run} />
        </div>
      )}
      {runs.length > 1 && (
        <div className="run-history">
          <span className="xsmall muted">History</span>
          <div className="run-history-list">
            {runs.map((r) => (
              <button
                type="button"
                key={r.id}
                className={cx('run-chip', r.id === run?.id && 'is-active', r.error || r.outcome?.isError ? 'is-error' : r.outcome ? 'is-ok' : 'is-pending')}
                onClick={() => onSelect(r.id)}
                title={`${r.tool} · ${timeAgo(r.startedAt)}`}
              >
                <span className="run-chip-dot" />
                <span className="mono">{r.tool}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function RunBadge({ run }: { run: ToolRun }) {
  if (!run.outcome && !run.error) return <Badge tone="accent" icon={<Spinner size={10} />}>Running</Badge>
  const failed = Boolean(run.error) || run.outcome?.isError
  return (
    <Badge tone={failed ? 'danger' : 'success'} icon={failed ? <CircleAlert /> : <CircleCheck />}>
      {failed ? 'Error' : 'OK'} · {run.durationMs} ms
    </Badge>
  )
}

function RunResult({ run }: { run: ToolRun }) {
  const [view, setView] = useState<'rich' | 'raw'>('rich')

  if (run.error) {
    const { title, detail } = describeError(run.error)
    return (
      <Alert tone="danger" title={title}>
        {detail}
      </Alert>
    )
  }
  if (!run.outcome) {
    return (
      <div className="stack">
        <CodeBlock value={run.args} label="Arguments" maxHeight={160} />
        <div className="cluster muted small">
          <Spinner size={14} /> Waiting for the server…
        </div>
      </div>
    )
  }

  const outcome = run.outcome
  const texts = (outcome.content ?? []).filter((c) => c.type === 'text' && typeof c.text === 'string').map((c) => c.text as string)
  const data = outcome.structuredContent ?? (texts.length === 1 ? parseContent(texts[0]) : undefined)
  const renderer = data !== undefined && !outcome.isError ? resolveResultRenderer(data, run.tool) : undefined

  return (
    <div className="stack">
      {outcome.isError && <Alert tone="danger" title="The tool reported an error">{texts.join('\n')}</Alert>}
      {renderer && (
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          aria-label="Result view"
          options={[
            { value: 'rich', label: renderer.label, icon: <Eye /> },
            { value: 'raw', label: 'Raw', icon: <FileJson /> },
          ]}
        />
      )}
      {renderer && view === 'rich' ? (
        <renderer.Component data={data} />
      ) : (
        <>
          {data !== undefined ? <CodeBlock value={data} label="Result" /> : <CodeBlock value={outcome} label="Response" />}
          <CodeBlock value={run.args} label="Arguments" maxHeight={160} />
        </>
      )}
    </div>
  )
}
