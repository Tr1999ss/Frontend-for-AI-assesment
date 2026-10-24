import { useCallback } from 'react'
import type { IngestionResult } from '../../api/types'
import { INGEST_HISTORY_LIMIT } from '../../config'
import { usePersistentState } from '../../lib/hooks'

export interface IngestHistoryEntry {
  result: IngestionResult
  via: 'file' | 'text'
  at: number
}

/** Recent ingestions, newest first, kept in this browser. */
export function useIngestHistory() {
  const [entries, setEntries] = usePersistentState<IngestHistoryEntry[]>('ingest.history', [])

  const add = useCallback(
    (result: IngestionResult, via: IngestHistoryEntry['via']) =>
      setEntries((all) => [{ result, via, at: Date.now() }, ...all].slice(0, INGEST_HISTORY_LIMIT)),
    [setEntries],
  )
  const clear = useCallback(() => setEntries([]), [setEntries])

  return { entries, add, clear }
}
