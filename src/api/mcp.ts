import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { authorizedFetch } from './client'

export type McpTransportKind = 'streamable-http' | 'sse'

export interface McpConnection {
  client: Client
  transport: McpTransportKind
}

/** JSON Schema subset that MCP tools use for their inputs. */
export interface JsonSchema {
  type?: string | string[]
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: unknown[]
  default?: unknown
}

export interface McpTool {
  name: string
  description?: string
  inputSchema: JsonSchema
}

const origin = () => window.location.origin

/**
 * Spring AI's MCP server speaks SSE by default and streamable HTTP when
 * spring.ai.mcp.server.protocol=STREAMABLE; try the newer transport first, fall back to SSE.
 * Every request, including the SSE stream, goes through authorizedFetch so it carries a
 * current bearer token even after renewals.
 */
export async function connectMcp(): Promise<McpConnection> {
  const options = { fetch: authorizedFetch }
  const attempts: [McpTransportKind, () => Transport][] = [
    ['streamable-http', () => new StreamableHTTPClientTransport(new URL('/mcp', origin()), options)],
    ['sse', () => new SSEClientTransport(new URL('/sse', origin()), options)],
  ]
  const errors: string[] = []
  for (const [kind, makeTransport] of attempts) {
    const client = new Client({ name: 'assesment-fe', version: '0.2.0' })
    try {
      await client.connect(makeTransport())
      return { client, transport: kind }
    } catch (e) {
      errors.push(`${kind}: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`)
      await client.close().catch(() => {})
    }
  }
  throw new Error(`Could not reach the MCP server. ${errors.join(' | ')}`)
}
