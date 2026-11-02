import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Ban, History, RefreshCw, Send, SquareTerminal } from 'lucide-react'
import { api, ApiError } from '../../api/client'
import type { A2aTask, A2aTaskState } from '../../api/types'
import { AuthErrorAlert } from '../../components/AuthErrorAlert'
import { Markdown } from '../../components/Markdown'
import { cx } from '../../lib/cx'
import { formatDuration, timeAgo } from '../../lib/format'
import { usePersistentState } from '../../lib/hooks'
import { Alert, Badge, Button, Card, CardHeader, CopyButton, EmptyState, Field, Textarea, type Tone } from '../../ui'
import { runA2aTask, TaskTimeoutError } from './runTask'
import { TaskTimeline } from './TaskTimeline'

const HISTORY_LIMIT = 10

const STATE_TONE: Record<A2aTaskState, Tone> = { submitted: 'neutral', working: 'info', completed: 'success', failed: 'danger' }

const EXAMPLES = ['What is error code ERR-4012 and how is it retried?', 'Which settings control the payment gateway timeout?']

interface ActiveRun {
  input: string
  /** null until the POST answers */
  task: A2aTask | null
}

/** Submit an instruction to the A2A specialist, follow its state to completed/failed, keep the last few results. */
export function TaskConsole() {
  const [input, setInput] = useState('')
  const [history, setHistory] = usePersistentState<A2aTask[]>('a2a.tasks', [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [active, setActive] = useState<ActiveRun | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [gone, setGone] = useState<string[]>([])
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  const remember = (task: A2aTask) => setHistory((h) => [task, ...h.filter((t) => t.id !== task.id)].slice(0, HISTORY_LIMIT))

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || controller.current) return
    const cancel = new AbortController()
    controller.current = cancel
    setActive({ input: text, task: null })
    setError(null)
    setNotice(null)
    try {
      const task = await runA2aTask(text, { signal: cancel.signal, onUpdate: (t) => setActive((run) => run && { ...run, task: t }) })
      remember(task)
      setSelectedId(task.id)
      setInput('')
    } catch (err) {
      if (err instanceof TaskTimeoutError) setNotice(`${err.message}. It may still finish on the server.`)
      else if (cancel.signal.aborted) setNotice('Stopped waiting. The agent may still finish the task on the server.')
      else setError(err)
    } finally {
      controller.current = null
      setActive(null)
    }
  }

  const refresh = async (id: string) => {
    setRefreshing(true)
    setError(null)
    try {
      remember(await api.a2a.getTask(id))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setGone((g) => [...g, id])
      else setError(err)
    } finally {
      setRefreshing(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e)
  }

  const shown = active ? null : (history.find((t) => t.id === selectedId) ?? history[0] ?? null)

  return (
    <div className="stack">
      <Card>
        <CardHeader icon={<SquareTerminal />} title="Task console" description="Send an instruction to the specialist over A2A and follow the task until it completes or fails." />
        <form className="stack" onSubmit={submit}>
          <Field label="Instruction" hint="Ctrl+Enter to send. The specialist answers from the knowledge base, with citations.">
            <Textarea
              autoGrow
              rows={3}
              maxRows={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={EXAMPLES[0]}
              disabled={active != null}
            />
          </Field>
          {!input && !active && (
            <div className="cluster" style={{ gap: 6 }}>
              {EXAMPLES.map((q) => (
                <Button key={q} size="sm" variant="ghost" onClick={() => setInput(q)}>
                  {q}
                </Button>
              ))}
            </div>
          )}
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />
          {notice && (
            <Alert tone="warning" onDismiss={() => setNotice(null)}>
              {notice}
            </Alert>
          )}
          <div className="cluster" style={{ justifyContent: 'flex-end' }}>
            {active && (
              <Button icon={<Ban />} onClick={() => controller.current?.abort()}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" icon={<Send />} loading={active != null} disabled={!input.trim()}>
              {active ? 'Running…' : 'Send task'}
            </Button>
          </div>
        </form>
      </Card>

      <section aria-live="polite" aria-label="Current task">
        {active ? (
          <TaskView input={active.input} task={active.task} />
        ) : shown ? (
          <TaskView
            input={shown.input}
            task={shown}
            gone={gone.includes(shown.id)}
            onRefresh={() => refresh(shown.id)}
            refreshing={refreshing}
          />
        ) : (
          <Card>
            <EmptyState icon={<SquareTerminal />} title="No tasks yet" description="Tasks you send appear here with their state, output, tokens and latency." />
          </Card>
        )}
      </section>

      {history.length > 1 && (
        <Card padded={false}>
          <CardHeader icon={<History />} title="Recent tasks" description="Kept in this browser." />
          <ul className="a2a-history">
            {history.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={cx('a2a-history-item', shown?.id === t.id && 'is-selected')}
                  aria-pressed={shown?.id === t.id}
                  onClick={() => setSelectedId(t.id)}
                  disabled={active != null}
                >
                  <Badge tone={STATE_TONE[t.state]}>{t.state}</Badge>
                  <span className="a2a-history-input">{t.input}</span>
                  <span className="xsmall muted">{timeAgo(Date.parse(t.createdAt))}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function TaskView({
  input,
  task,
  gone = false,
  onRefresh,
  refreshing = false,
}: {
  input: string
  task: A2aTask | null
  gone?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}) {
  return (
    <Card className="a2a-task">
      <CardHeader
        title={task ? <Badge tone={STATE_TONE[task.state]} dot={task.state === 'working' ? 'pulse' : true}>{task.state}</Badge> : <Badge dot="pulse">sending</Badge>}
        description={<span className="a2a-task-input">{input}</span>}
        actions={
          onRefresh && (
            <Button variant="ghost" size="sm" icon={<RefreshCw />} onClick={onRefresh} loading={refreshing} title="Fetch the latest state (tasks/get)">
              Refresh
            </Button>
          )
        }
      />
      <div className="stack">
        <TaskTimeline task={task} />
        {gone && (
          <Alert tone="warning" title="No longer on the server">
            The backend keeps tasks in memory, so they are gone after a restart. This is the last state seen.
          </Alert>
        )}
        {task?.state === 'failed' && (
          <Alert tone="danger" title="Task failed">
            {task.error || 'The agent reported no reason.'}
          </Alert>
        )}
        {task?.output != null && (
          <div className="a2a-output">
            <div className="cluster" style={{ justifyContent: 'space-between' }}>
              <h4 className="a2a-label">Output</h4>
              <CopyButton text={task.output} title="Copy output" />
            </div>
            {task.output ? <Markdown>{task.output}</Markdown> : <p className="small muted">The agent returned an empty answer.</p>}
          </div>
        )}
        {task && (
          <dl className="a2a-metrics">
            <div>
              <dt>Input tokens</dt>
              <dd>{task.inputTokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Output tokens</dt>
              <dd>{task.outputTokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Total tokens</dt>
              <dd>{(task.inputTokens + task.outputTokens).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Latency</dt>
              <dd>{task.state === 'completed' || task.state === 'failed' ? formatDuration(task.latencyMs) : '—'}</dd>
            </div>
            <div className="a2a-metric-id">
              <dt>Task id</dt>
              <dd className="mono">{task.id}</dd>
            </div>
          </dl>
        )}
      </div>
    </Card>
  )
}
