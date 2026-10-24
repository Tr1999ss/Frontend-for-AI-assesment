import type {
  Answer,
  AskRequest,
  Category,
  CreateCategoryRequest,
  DocPage,
  DocsIndex,
  EvaluationReport,
  EvaluationRequest,
  IngestionResult,
  ProblemDetail,
  RetrievalCatalog,
  SearchParams,
  SearchResult,
  TextIngestPayload,
  UpdateCategoryRequest,
} from './types'

/** A non-2xx response, carrying the backend's ProblemDetail when it sent one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetail,
  ) {
    super(problem.detail || problem.title || `HTTP ${status}`)
  }
}

type TokenSource = () => Promise<string | null>

let tokenSource: TokenSource = async () => null

/** Set once by the auth layer; the client stays unaware of how tokens are obtained. */
export function configureApiAuth(source: TokenSource) {
  tokenSource = source
}

export function getAccessToken(): Promise<string | null> {
  return tokenSource()
}

/** fetch with the current bearer token attached (also used by the MCP transport). */
export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await tokenSource()
  const headers = new Headers(init.headers)
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, init)
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok) {
    let problem: ProblemDetail = { status: response.status, title: response.statusText }
    if (contentType.includes('json')) {
      problem = { ...problem, ...(await response.json()) }
    } else {
      const text = await response.text()
      if (text) problem.detail = text
      // the dev-server proxy answers a bare 5xx when the backend isn't listening
      else if (response.status >= 500) problem = { ...problem, title: 'Backend unreachable', detail: 'The dev server could not reach the backend. Is it running?' }
    }
    throw new ApiError(response.status, problem)
  }
  if (response.status === 204) return undefined as T
  return (contentType.includes('json') ? response.json() : response.text()) as Promise<T>
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

function query(params: Record<string, string | number | boolean | string[] | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v))
    else search.append(key, String(value))
  }
  return search.toString()
}

export const api = {
  health: () => request<{ status: string; components?: Record<string, { status: string }> }>('/actuator/health'),

  ingestFile(file: File, categories: string[]): Promise<IngestionResult> {
    const form = new FormData()
    form.append('file', file)
    categories.forEach((c) => form.append('categories', c))
    return request('/api/ingest/file', { method: 'POST', body: form })
  },

  ingestText: (payload: TextIngestPayload) => request<IngestionResult>('/api/ingest/text', json('POST', payload)),

  search: (params: SearchParams) =>
    request<SearchResult>(`/api/search?${query({ ...params, explain: params.explain ? 'true' : undefined })}`),

  /** options, defaults, limits and availability for search and ask */
  retrievalCatalog: () => request<RetrievalCatalog>('/api/search/modes'),

  ask: (body: AskRequest) => request<Answer>('/api/ask', json('POST', body)),

  activeCategories: () => request<Category[]>('/api/categories'),

  chat: (q: string) => request<string>(`/api/chat?${query({ q })}`),

  docs: {
    index: () => request<DocsIndex>('/api/docs'),
    page: (slug: string) => request<DocPage>(`/api/docs/${slug.split('/').map(encodeURIComponent).join('/')}`),
    /** images need the bearer token, so they are fetched as blobs rather than loaded by <img src> */
    async asset(path: string): Promise<Blob> {
      const response = await authorizedFetch(`/api/docs/assets/${path.split('/').map(encodeURIComponent).join('/')}`)
      if (!response.ok) throw new ApiError(response.status, { status: response.status, title: response.statusText })
      return response.blob()
    },
  },

  admin: {
    list: (includeInactive = true) => request<Category[]>(`/api/admin/categories?includeInactive=${includeInactive}`),
    create: (body: CreateCategoryRequest) => request<Category>('/api/admin/categories', json('POST', body)),
    update: (name: string, body: UpdateCategoryRequest) =>
      request<Category>(`/api/admin/categories/${encodeURIComponent(name)}`, json('PATCH', body)),
    remove: (name: string) => request<void>(`/api/admin/categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    /** synchronous; LLM-heavy configurations can take minutes */
    evaluate: (body: EvaluationRequest) => request<EvaluationReport>('/api/admin/evaluation', json('POST', body)),
  },
}
