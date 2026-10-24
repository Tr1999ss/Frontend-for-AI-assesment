import { api } from '../../api/client'
import type { CatalogOption, RetrievalCatalog } from '../../api/types'
import { useResource } from '../../lib/hooks'

// GET /api/search/modes, fetched once per page load: options rarely change while the app runs.
let cache: Promise<RetrievalCatalog> | null = null

function load(): Promise<RetrievalCatalog> {
  cache ??= api.retrievalCatalog().catch((e: unknown) => {
    cache = null
    throw e
  })
  return cache
}

export function useRetrievalCatalog() {
  return useResource(load, [])
}

/** Display names for option values; anything not listed is title-cased from its enum name. */
const LABELS: Record<string, string> = {
  SEMANTIC: 'Semantic',
  KEYWORD: 'Keyword',
  HYBRID: 'Hybrid',
  NONE: 'None',
  REWRITE: 'Rewrite',
  MULTI_QUERY: 'Multi-query',
  HYDE: 'HyDE',
  LLM: 'LLM',
  COHERE: 'Cohere',
  CROSS_ENCODER: 'Cross-encoder',
  MMR: 'MMR',
  POSTGRES_FTS: 'Postgres full-text',
  PARADEDB_BM25: 'ParadeDB BM25',
}

export function optionLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ')
}

export function findOption(options: CatalogOption[] | undefined, value: string | undefined): CatalogOption | undefined {
  return options?.find((o) => o.value === value)
}
