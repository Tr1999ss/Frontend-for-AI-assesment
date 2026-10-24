// App-wide constants. Values that mirror backend settings note the property they mirror.

export const APP_NAME = 'Knowledge Console'

/** Where the dev server proxies to (BACKEND_URL in .env); shown for reference only. */
export const BACKEND_URL = __BACKEND_URL__

export const UPLOAD = {
  /** ingestion.intake.max-size */
  maxBytes: 20 * 1024 * 1024,
  /** ingestion.intake.allowed-formats */
  accept: ['.pdf', '.md', '.markdown', '.json', '.txt', '.text'],
}

export const HEALTH_POLL_MS = 15_000
export const INGEST_HISTORY_LIMIT = 50
export const TOOL_RUN_HISTORY_LIMIT = 20
