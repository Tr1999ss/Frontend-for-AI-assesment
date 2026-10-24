import type { SearchResult } from '../../api/types'
import { HitCard } from './HitCard'
import { RetrievalInsights } from './RetrievalInsights'

/** A full search result: what ran, warnings, explain timeline and the ranked passages. */
export function HitList({ result, elapsedMs, className }: { result: SearchResult; elapsedMs?: number; className?: string }) {
  const maxScore = Math.max(0, ...result.hits.map((h) => h.score))
  return (
    <div className={className ?? 'stack'}>
      <RetrievalInsights applied={result.applied} warnings={result.warnings} explain={result.explain} elapsedMs={elapsedMs} />
      <div className="hit-list stagger">
        {result.hits.map((hit, i) => (
          <HitCard key={hit.chunkId} hit={hit} rank={i + 1} query={result.query} index={i} maxScore={maxScore} />
        ))}
      </div>
    </div>
  )
}
