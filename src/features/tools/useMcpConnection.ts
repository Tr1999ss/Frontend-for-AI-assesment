import { useCallback, useEffect, useRef, useState } from 'react'
import { connectMcp, type McpConnection, type McpTool, type McpTransportKind } from '../../api/mcp'

export type ConnectionStatus = 'connecting' | 'connected' | 'error'

export interface ToolCallOutcome {
  isError?: boolean
  content?: { type: string; text?: string; [key: string]: unknown }[]
  structuredContent?: unknown
}

/** Owns one MCP client for the page's lifetime: connect, list tools, call tools, reconnect. */
export function useMcpConnection() {
  const connection = useRef<McpConnection | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [transport, setTransport] = useState<McpTransportKind | null>(null)
  const [tools, setTools] = useState<McpTool[]>([])
  const [error, setError] = useState<unknown>(null)

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)
    await connection.current?.client.close().catch(() => {})
    connection.current = null
    try {
      const conn = await connectMcp()
      connection.current = conn
      const { tools } = await conn.client.listTools()
      setTools(tools as McpTool[])
      setTransport(conn.transport)
      setStatus('connected')
    } catch (e) {
      setTransport(null)
      setError(e)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      connection.current?.client.close().catch(() => {})
      connection.current = null
    }
  }, [connect])

  const callTool = useCallback(async (name: string, args: Record<string, unknown>): Promise<ToolCallOutcome> => {
    if (!connection.current) throw new Error('Not connected to the MCP server')
    return (await connection.current.client.callTool({ name, arguments: args })) as ToolCallOutcome
  }, [])

  return { status, transport, tools, error, reconnect: connect, callTool }
}
