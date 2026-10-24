import { useState, type FormEvent } from 'react'
import { Clock, RefreshCw, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { api } from '../../api/client'
import type { SearchResult } from '../../api/types'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'
import { useAction, usePersistentState } from '../../lib/hooks'
import { Alert, Button, Card, CardHeader, Chip, EmptyState, Input, PageHeader, Skeleton } from '../../ui'
import { HitList } from '../retrieval/HitList'
import { RetrievalInsights } from '../retrieval/RetrievalInsights'
import { DEFAULT_FILTERS, RetrievalFilters, toRequest, withDefaults, type RetrievalFilterValues } from '../retrieval/RetrievalFilters'
import './search.css'

const RECENT_LIMIT = 8

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [stored, setFilters] = usePersistentState<RetrievalFilterValues>('search.filters', DEFAULT_FILTERS)
  const filters = withDefaults(stored)
  const [recent, setRecent] = usePersistentState<string[]>('search.recent', [])
  const [result, setResult] = useState<{ data: SearchResult; ms: number; filters: RetrievalFilterValues } | null>(null)

  const search = useAction(async (q: string, using: RetrievalFilterValues) => {
    const started = performance.now()
    const data = await api.search({ q, ...toRequest(using), minScore: using.minScore })
    setResult({ data, ms: Math.round(performance.now() - started), filters: using })
    setRecent((all) => [q, ...all.filter((r) => r !== q)].slice(0, RECENT_LIMIT))
    return data
  })

  // Strategy options can cost LLM calls, so filter edits mark results stale instead of re-running.
  const stale = result != null && JSON.stringify(result.filters) !== JSON.stringify(filters)

  const run = (q = query, using = filters) => {
    const text = q.trim()
    if (!text) return
    setQuery(text)
    search.run(text, using)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run()
  }


  return (
    <>
      <PageHeader icon={<Search />} title="Search" description="Semantic search: passages ranked by meaning, not just keywords." />

      <form className="search-bar" onSubmit={submit}>
        <Input
          icon={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the knowledge base…"
          aria-label="Search query"
          className="search-input grow"
          autoFocus
          trailing={
            query && (
              <Button variant="ghost" size="sm" icon={<X />} aria-label="Clear" onClick={() => setQuery('')} />
            )
          }
        />
        <Button type="submit" variant="primary" size="lg" loading={search.busy} disabled={!query.trim()}>
          Search
        </Button>
      </form>

      <div className="search-layout">
        <Card className="search-filters">
          <CardHeader icon={<SlidersHorizontal />} title="Filters" />
          <RetrievalFilters value={filters} onChange={setFilters} showMinScore />
        </Card>

        <section className="search-results" aria-live="polite">
          <ApiErrorAlert error={search.error} onDismiss={search.clearError} />

          {search.busy && !result && <ResultsSkeleton />}

          {result && (
            <>
              <div className="search-summary">
                <span>
                  <strong>{result.data.hits.length}</strong> passage{result.data.hits.length === 1 ? '' : 's'} for{' '}
                  <strong>“{result.data.query}”</strong>
                </span>
              </div>
              {stale && (
                <Alert
                  tone="accent"
                  title="Filters changed"
                  action={
                    <Button size="sm" variant="primary" icon={<RefreshCw />} loading={search.busy} onClick={() => run(result.data.query)}>
                      Re-run
                    </Button>
                  }
                >
                  These results are from the previous settings.
                </Alert>
              )}
              {result.data.hits.length === 0 ? (
                <>
                  <RetrievalInsights applied={result.data.applied} warnings={result.data.warnings} explain={result.data.explain} elapsedMs={result.ms} />
                  <Card>
                    <EmptyState
                      icon={<SearchX />}
                      title="No passages matched"
                      description="Try different words or another mode, remove category filters, or ingest more documents."
                    />
                  </Card>
                </>
              ) : (
                <HitList result={result.data} elapsedMs={result.ms} className={search.busy || stale ? 'stack search-hits is-refreshing' : 'stack search-hits'} />
              )}
            </>
          )}

          {!result && !search.busy && (
            <Card>
              <EmptyState
                icon={<Search />}
                title="Search your documents"
                description="Results show the source, section, page and how closely each passage matches."
                action={
                  recent.length > 0 && (
                    <div className="recent">
                      <span className="xsmall muted recent-label">
                        <Clock size={12} /> Recent
                      </span>
                      <div className="cluster" style={{ justifyContent: 'center' }}>
                        {recent.map((r) => (
                          <Chip key={r} onClick={() => run(r)}>
                            {r}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )
                }
              />
            </Card>
          )}
        </section>
      </div>
    </>
  )
}

function ResultsSkeleton() {
  return (
    <div className="search-hits">
      {[0, 1, 2].map((i) => (
        <div key={i} className="hit" style={{ gap: 12 }}>
          <div className="cluster">
            <Skeleton width={26} height={26} />
            <Skeleton width="40%" />
          </div>
          <Skeleton />
          <Skeleton width="85%" />
          <Skeleton width="60%" />
        </div>
      ))}
    </div>
  )
}
