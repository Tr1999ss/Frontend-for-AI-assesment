import type { ReactNode } from 'react'
import { Check, Circle, X } from 'lucide-react'
import type { A2aTask } from '../../api/types'
import { cx } from '../../lib/cx'
import { formatDuration } from '../../lib/format'
import { Spinner } from '../../ui'

type StepStatus = 'done' | 'current' | 'upcoming' | 'failed'

interface Step {
  label: string
  status: StepStatus
  detail?: string
}

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString() : undefined)

/** submitted → working → completed | failed. Without a task yet, the request is still on its way. */
export function timelineSteps(task: A2aTask | null): Step[] {
  if (!task) {
    return [
      { label: 'Submitted', status: 'current', detail: 'Sending to the agent…' },
      { label: 'Working', status: 'upcoming' },
      { label: 'Completed', status: 'upcoming' },
    ]
  }
  const order = { submitted: 0, working: 1, completed: 2, failed: 2 }[task.state]
  const status = (i: number): StepStatus => (i < order ? 'done' : i === order ? 'current' : 'upcoming')
  const finished = task.state === 'completed' || task.state === 'failed'
  return [
    { label: 'Submitted', status: status(0), detail: time(task.createdAt) },
    { label: 'Working', status: status(1), detail: order === 1 ? 'The specialist is searching and answering…' : undefined },
    {
      label: task.state === 'failed' ? 'Failed' : 'Completed',
      status: task.state === 'failed' ? 'failed' : finished ? 'done' : 'upcoming',
      detail: finished ? [time(task.completedAt), task.latencyMs ? `after ${formatDuration(task.latencyMs)}` : undefined].filter(Boolean).join(' · ') : undefined,
    },
  ]
}

const ICON: Record<StepStatus, ReactNode> = {
  done: <Check size={13} />,
  failed: <X size={13} />,
  current: <Spinner size={13} />,
  upcoming: <Circle size={9} />,
}

const STATUS_TEXT: Record<StepStatus, string> = { done: 'done', failed: 'failed', current: 'in progress', upcoming: 'not started' }

export function TaskTimeline({ task }: { task: A2aTask | null }) {
  return (
    <ol className="a2a-timeline" aria-label="Task state">
      {timelineSteps(task).map((step) => (
        <li key={step.label} className={cx('a2a-step', `is-${step.status}`)} aria-current={step.status === 'current' ? 'step' : undefined}>
          <span className="a2a-step-dot" aria-hidden>
            {ICON[step.status]}
          </span>
          <span className="a2a-step-text">
            <span className="a2a-step-label">
              {step.label}
              <span className="sr-only"> ({STATUS_TEXT[step.status]})</span>
            </span>
            {step.detail && <span className="xsmall muted">{step.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
