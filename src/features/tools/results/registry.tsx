import type { ComponentType } from 'react'
import type { Answer, Category, IngestionResult, RetrievalCatalog, SearchResult } from '../../../api/types'
import { Badge, Tag } from '../../../ui'
import { AnswerView } from '../../retrieval/AnswerView'
import { CatalogView } from '../../retrieval/CatalogView'
import { HitList } from '../../retrieval/HitList'
import { RetrievalInsights } from '../../retrieval/RetrievalInsights'

/**
 * A rich view for a tool's parsed output. Matched on the data's shape rather than the tool
 * name, so the same view works for REST and MCP results; the raw JSON is always one click away.
 */
export interface ResultRenderer {
  id: string
  label: string
  matches: (data: unknown, toolName: string) => boolean
  Component: ComponentType<{ data: unknown }>
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const renderers: ResultRenderer[] = [
  {
    id: 'answer',
    label: 'Answer',
    matches: (d) => isObject(d) && typeof d.answer === 'string' && Array.isArray(d.citations),
    Component: ({ data }) => <AnswerView answer={data as Answer} />,
  },
  {
    id: 'search',
    label: 'Passages',
    matches: (d) => isObject(d) && typeof d.query === 'string' && Array.isArray(d.hits),
    Component: ({ data }) => {
      const result = data as SearchResult
      return result.hits.length === 0 ? (
        <div className="stack">
          <RetrievalInsights applied={result.applied} warnings={result.warnings} explain={result.explain} />
          <p className="muted small">No passages matched.</p>
        </div>
      ) : (
        <HitList result={result} />
      )
    },
  },
  {
    id: 'retrieval-catalog',
    label: 'Options',
    matches: (d) => isObject(d) && isObject(d.defaults) && isObject(d.limits) && Array.isArray(d.mode),
    Component: ({ data }) => <CatalogView catalog={data as RetrievalCatalog} />,
  },
  {
    id: 'ingestion',
    label: 'Ingestion',
    matches: (d) => isObject(d) && typeof d.requestId === 'string' && typeof d.chunkCount === 'number',
    Component: ({ data }) => {
      const r = data as IngestionResult
      return (
        <dl className="facts">
          <dt>Status</dt>
          <dd>
            <Badge tone={r.status === 'INGESTED' ? 'success' : 'warning'}>{r.status}</Badge>
          </dd>
          <dt>File</dt>
          <dd>{r.filename}</dd>
          <dt>Format</dt>
          <dd>{r.format}</dd>
          <dt>Categories</dt>
          <dd className="cluster" style={{ gap: 4 }}>
            {r.categories.map((c) => (
              <Tag key={c} emphasis={c === r.primaryCategory}>
                {c}
              </Tag>
            ))}
          </dd>
          <dt>Chunks</dt>
          <dd>{r.chunkCount}</dd>
          <dt>Document</dt>
          <dd className="mono truncate">{r.documentId ?? '—'}</dd>
        </dl>
      )
    },
  },
  {
    id: 'categories',
    label: 'Categories',
    matches: (d) => Array.isArray(d) && d.length > 0 && d.every((c) => isObject(c) && typeof c.name === 'string' && 'description' in c),
    Component: ({ data }) => (
      <ul className="tool-category-list">
        {(data as Category[]).map((c) => (
          <li key={c.name}>
            <span className="mono">{c.name}</span>
            <span className="muted small">{c.description}</span>
          </li>
        ))}
      </ul>
    ),
  },
]

/** Adds a renderer with priority over the built-in ones. */
export function registerResultRenderer(renderer: ResultRenderer) {
  renderers.unshift(renderer)
}

export function resolveResultRenderer(data: unknown, toolName: string): ResultRenderer | undefined {
  return renderers.find((r) => r.matches(data, toolName))
}
