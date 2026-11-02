import { Network } from 'lucide-react'
import { PageHeader } from '../../ui'
import { AgentCardPanel } from './AgentCardPanel'
import { TaskConsole } from './TaskConsole'
import './a2a.css'

export function A2aPage() {
  return (
    <>
      <PageHeader
        icon={<Network />}
        title="Agent-to-agent"
        description="The code and configuration specialist the agent team can delegate to over the A2A protocol: its public card, and a console to send it tasks."
      />
      <div className="a2a-layout">
        <AgentCardPanel />
        <TaskConsole />
      </div>
    </>
  )
}
