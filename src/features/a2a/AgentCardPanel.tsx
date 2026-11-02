import { Check, IdCard, RefreshCw, X } from 'lucide-react'
import { api } from '../../api/client'
import { AuthErrorAlert } from '../../components/AuthErrorAlert'
import { useResource } from '../../lib/hooks'
import { Badge, Button, Card, CardHeader, CopyButton, EmptyState, Skeleton, Tag } from '../../ui'

/** The agent's public A2A card (GET /.well-known/agent-card.json). */
export function AgentCardPanel() {
  const card = useResource(() => api.a2a.agentCard(), [])
  const reload = <Button variant="ghost" size="sm" icon={<RefreshCw />} aria-label="Reload agent card" onClick={card.reload} disabled={card.loading} />

  if (card.loading && !card.data) {
    return (
      <Card className="stack" aria-label="Loading agent card" aria-busy>
        <Skeleton width="55%" height={18} />
        <Skeleton height={36} />
        <Skeleton width="70%" />
        <Skeleton height={60} />
      </Card>
    )
  }
  if (!card.data) {
    return (
      <Card className="stack">
        <CardHeader icon={<IdCard />} title="Agent card" actions={reload} />
        {card.error ? <AuthErrorAlert error={card.error} /> : <EmptyState compact title="No agent card" description="The backend returned nothing." />}
      </Card>
    )
  }

  const { name, description, version, url, capabilities = {}, skills = [], defaultInputModes = [], defaultOutputModes = [] } = card.data
  const capabilityEntries = Object.entries(capabilities)
  return (
    <Card className="a2a-card">
      <CardHeader
        icon={<IdCard />}
        title={
          <>
            <span className="mono">{name}</span> <Badge tone="accent">v{version}</Badge>
          </>
        }
        description={description}
        actions={reload}
      />
      <div className="stack">
        {card.error != null && <AuthErrorAlert error={card.error} />}
        <section aria-label="Endpoint">
          <h4 className="a2a-label">Endpoint</h4>
          <div className="cluster a2a-endpoint">
            <span className="mono a2a-url">{url}</span>
            <CopyButton text={url} title="Copy endpoint" />
          </div>
        </section>

        <section aria-label="Capabilities">
          <h4 className="a2a-label">Capabilities</h4>
          {capabilityEntries.length === 0 ? (
            <p className="xsmall muted">None declared.</p>
          ) : (
            <ul className="a2a-capabilities">
              {capabilityEntries.map(([key, value]) => (
                <li key={key}>
                  {typeof value === 'boolean' ? (
                    <Badge tone={value ? 'success' : 'neutral'} icon={value ? <Check /> : <X />}>
                      {humanize(key)}
                      <span className="sr-only">: {value ? 'supported' : 'not supported'}</span>
                    </Badge>
                  ) : (
                    <Badge>
                      {humanize(key)}: {String(value)}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Skills">
          <h4 className="a2a-label">Skills</h4>
          {skills.length === 0 ? (
            <p className="xsmall muted">No skills declared.</p>
          ) : (
            <ul className="a2a-skills">
              {skills.map((skill) => (
                <li key={skill.id} className="a2a-skill">
                  <div className="cluster" style={{ justifyContent: 'space-between' }}>
                    <strong>{skill.name}</strong>
                    <span className="mono xsmall muted">{skill.id}</span>
                  </div>
                  <p className="small subtle a2a-skill-description">{skill.description}</p>
                  {skill.tags && skill.tags.length > 0 && (
                    <div className="cluster" style={{ gap: 4 }}>
                      {skill.tags.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {(defaultInputModes.length > 0 || defaultOutputModes.length > 0) && (
          <p className="xsmall muted">
            Input: {defaultInputModes.join(', ') || '—'} · Output: {defaultOutputModes.join(', ') || '—'}
          </p>
        )}
      </div>
    </Card>
  )
}

/** pushNotifications → Push notifications */
const humanize = (key: string) => {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
