import { useMemo, useState, type CSSProperties } from 'react'
import { Plug, RefreshCw, Search, Wrench } from 'lucide-react'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'
import { TOOL_RUN_HISTORY_LIMIT } from '../../config'
import { cx } from '../../lib/cx'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Skeleton } from '../../ui'
import { ToolOutput, type ToolRun } from './ToolOutput'
import { ToolRunner } from './ToolRunner'
import { useMcpConnection } from './useMcpConnection'
import './tools.css'

export function ToolsPage() {
  const mcp = useMcpConnection()
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [runs, setRuns] = useState<ToolRun[]>([])
  const [selectedRun, setSelectedRun] = useState<string | null>(null)

  const tool = mcp.tools.find((t) => t.name === selected) ?? mcp.tools[0]
  const visibleTools = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? mcp.tools.filter((t) => t.name.includes(q) || t.description?.toLowerCase().includes(q)) : mcp.tools
  }, [mcp.tools, filter])

  const running = runs.some((r) => !r.outcome && !r.error)

  const execute = async (args: Record<string, unknown>) => {
    if (!tool) return
    const run: ToolRun = { id: crypto.randomUUID(), tool: tool.name, args, startedAt: Date.now() }
    setRuns((all) => [run, ...all].slice(0, TOOL_RUN_HISTORY_LIMIT))
    setSelectedRun(run.id)
    const started = performance.now()
    const finish = (change: Partial<ToolRun>) =>
      setRuns((all) => all.map((r) => (r.id === run.id ? { ...r, ...change, durationMs: Math.round(performance.now() - started) } : r)))
    try {
      finish({ outcome: await mcp.callTool(tool.name, args) })
    } catch (e) {
      finish({ error: e })
    }
  }

  return (
    <>
      <PageHeader
        icon={<Wrench />}
        title="MCP tools"
        description="The tools the backend exposes to AI agents, runnable by hand. Forms are generated from each tool's schema."
        actions={
          <>
            <ConnectionBadge status={mcp.status} transport={mcp.transport} />
            <Button icon={<RefreshCw />} onClick={mcp.reconnect} loading={mcp.status === 'connecting'}>
              Reconnect
            </Button>
          </>
        }
      />

      {mcp.status === 'error' && (
        <div style={{ marginBottom: 20 }}>
          <ApiErrorAlert error={mcp.error} />
        </div>
      )}

      <div className="tools-layout">
        <Card padded={false} className="tool-list-card">
          <div className="tool-list-search">
            <Input icon={<Search />} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter tools" aria-label="Filter tools" />
          </div>
          <ul className="tool-list stagger">
            {mcp.status === 'connecting' &&
              mcp.tools.length === 0 &&
              [0, 1, 2, 3].map((i) => (
                <li key={i} className="tool-list-skeleton">
                  <Skeleton width="60%" />
                  <Skeleton width="90%" height={10} />
                </li>
              ))}
            {visibleTools.map((t, i) => (
              <li key={t.name} style={{ '--i': i } as CSSProperties}>
                <button type="button" className={cx('tool-item', t.name === tool?.name && 'is-active')} onClick={() => setSelected(t.name)}>
                  <span className="tool-item-name mono">{t.name}</span>
                  {t.description && <span className="tool-item-description clamp-2">{t.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {tool ? (
          <ToolRunner key={tool.name} tool={tool} busy={running} disabled={mcp.status !== 'connected'} onRun={execute} />
        ) : (
          <Card>
            <EmptyState icon={<Plug />} title={mcp.status === 'connecting' ? 'Connecting…' : 'No tools'} description="Tools appear once the MCP server responds." />
          </Card>
        )}

        <ToolOutput runs={runs} selectedId={selectedRun} onSelect={setSelectedRun} />
      </div>
    </>
  )
}

function ConnectionBadge({ status, transport }: { status: string; transport: string | null }) {
  if (status === 'connected') return <Badge tone="success" dot="pulse" variant="outline">Connected · {transport}</Badge>
  if (status === 'connecting') return <Badge tone="accent" dot variant="outline">Connecting</Badge>
  return <Badge tone="danger" dot variant="outline">Disconnected</Badge>
}
