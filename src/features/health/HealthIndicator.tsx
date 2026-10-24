import { Activity } from 'lucide-react'
import { BACKEND_URL } from '../../config'
import { timeAgo } from '../../lib/format'
import { Badge, Popover, type Tone } from '../../ui'
import { useHealth, type HealthStatus } from './useHealth'
import './health.css'

const PRESENTATION: Record<HealthStatus, { tone: Tone; label: string }> = {
  checking: { tone: 'neutral', label: 'Checking' },
  up: { tone: 'success', label: 'Online' },
  degraded: { tone: 'warning', label: 'Degraded' },
  down: { tone: 'danger', label: 'Offline' },
}

export function HealthIndicator() {
  const health = useHealth()
  const { tone, label } = PRESENTATION[health.status]

  return (
    <Popover
      trigger={(props) => (
        <button type="button" className="health-trigger" {...props}>
          <Badge tone={tone} dot={health.status === 'up' ? 'pulse' : true} variant="outline">
            {label}
          </Badge>
        </button>
      )}
    >
      <div className="health-panel">
        <div className="health-panel-head">
          <Activity size={15} />
          <span className="grow">Backend</span>
          <span className="mono xsmall muted">{BACKEND_URL.replace(/^https?:\/\//, '')}</span>
        </div>
        {health.error && <p className="small health-error">{health.error}</p>}
        <ul className="health-components">
          {health.components.map((c) => (
            <li key={c.name}>
              <span className="grow">{c.name}</span>
              <Badge tone={c.status === 'UP' ? 'success' : 'warning'}>{c.status}</Badge>
            </li>
          ))}
        </ul>
        {health.checkedAt && <p className="xsmall muted">Checked {timeAgo(health.checkedAt)}</p>}
      </div>
    </Popover>
  )
}
