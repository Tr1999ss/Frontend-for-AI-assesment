// Mirrors the Spring Boot records in C:\Project\generic. Keep in sync when those change.

export type SourceFormat = 'PDF' | 'MARKDOWN' | 'JSON' | 'TEXT' | 'UNKNOWN'
export const INGESTIBLE_FORMATS: SourceFormat[] = ['PDF', 'MARKDOWN', 'JSON', 'TEXT']

export type IngestionStatus = 'INGESTED' | 'DUPLICATE'

/** com.shk.generic.ingestion.IngestionResult */
export interface IngestionResult {
  requestId: string
  documentId: string | null
  status: IngestionStatus
  filename: string
  format: SourceFormat
  primaryCategory: string | null
  categories: string[]
  chunkCount: number
}

/** com.shk.generic.ingestion.intake.text.TextIngestPayload */
export interface TextIngestPayload {
  title: string
  text: string
  format?: SourceFormat
  categories?: string[]
  attributes?: Record<string, unknown>
}

/** com.shk.generic.category.web.CategoryResponse */
export interface Category {
  name: string
  description: string
  active: boolean
}

export interface CreateCategoryRequest {
  name: string
  description: string
}

/** Partial update: omitted fields are left unchanged. */
export interface UpdateCategoryRequest {
  description?: string
  active?: boolean
}

// ---------- retrieval (see docs/api.md in the backend) ----------

/** com.shk.generic.retrieval.CategoryScope */
export type CategoryScope = 'ANY' | 'PRIMARY'

export type RetrievalMode = 'SEMANTIC' | 'KEYWORD' | 'HYBRID'
export type QueryTransformType = 'NONE' | 'REWRITE' | 'MULTI_QUERY' | 'HYDE'
export type RerankerType = 'NONE' | 'LLM' | 'COHERE' | 'CROSS_ENCODER'
export type DiversifierType = 'NONE' | 'MMR'

/**
 * What a hit's score means. Scores of different types are not comparable:
 * COSINE, FTS_RANK and RERANK are 0..1, BM25 is unbounded, RRF is roughly 0.01-0.05.
 */
export type ScoreType = 'COSINE' | 'FTS_RANK' | 'BM25' | 'RRF' | 'RERANK'

/** Optional strategy fields shared by search and ask; omitted fields use the server defaults. */
export interface RetrievalOptions {
  mode?: RetrievalMode
  queryTransform?: QueryTransformType
  rerank?: RerankerType
  diversify?: DiversifierType
  /** pool fed to fusion, reranking and MMR: topK..limits.maxCandidates */
  candidates?: number
  /** MMR trade-off: 1 = pure relevance, 0 = pure diversity */
  mmrLambda?: number
  /** adds `explain` and per-hit `trace` */
  explain?: boolean
}

/** Query parameters of GET /api/search */
export interface SearchParams extends RetrievalOptions {
  q: string
  categories?: string[]
  scope?: CategoryScope
  topK?: number
  /** cosine floor for the semantic leg only */
  minScore?: number
}

/** com.shk.generic.retrieval.web.AskRequest */
export interface AskRequest extends RetrievalOptions {
  question: string
  categories?: string[]
  scope?: CategoryScope
  topK?: number
}

/** com.shk.generic.retrieval.pipeline.StageScore: a hit's position at one pipeline stage */
export interface StageScore {
  /** e.g. semantic[0], keyword[0], rrf, rerank:LLM, mmr */
  stage: string
  rank: number
  score: number
  scoreType: ScoreType
}

/** com.shk.generic.retrieval.SearchHit */
export interface SearchHit {
  chunkId: string
  documentId: string
  source: string
  title: string | null
  page: number | null
  categories: string[]
  primaryCategory: string | null
  chunkIndex: number
  /** the final stage's score; meaning depends on scoreType */
  score: number
  /** absent in responses from older backends, where scores were always cosine */
  scoreType?: ScoreType
  text: string
  /** only with explain=true */
  trace?: StageScore[]
}

/** com.shk.generic.retrieval.AppliedRetrieval: what actually ran (skipped stages show as NONE) */
export interface AppliedRetrieval {
  mode: RetrievalMode
  queryTransform: QueryTransformType
  rerank: RerankerType
  diversify: DiversifierType
  topK: number
  candidates: number
  keywordEngine: string | null
  minScore: number | null
  keywordMinScore: number | null
  rrfK: number | null
  mmrLambda: number | null
  llmCalls: number
  scoreType: ScoreType
}

/** com.shk.generic.retrieval.RetrievalExplanation */
export interface RetrievalExplanation {
  originalQuery: string
  semanticQueries: string[]
  keywordQueries: string[]
  stages: { name: string; candidates: number; durationMs: number; detail: string }[]
}

/** com.shk.generic.retrieval.SearchResult */
export interface SearchResult {
  query: string
  hits: SearchHit[]
  applied?: AppliedRetrieval | null
  warnings?: string[]
  explain?: RetrievalExplanation
}

/** com.shk.generic.retrieval.answer.Citation */
export interface Citation {
  number: number
  documentId: string
  chunkId: string
  source: string
  title: string | null
  page: number | null
  /** same scale as the answer's retrieval.scoreType */
  score: number
}

/** com.shk.generic.retrieval.answer.Answer */
export interface Answer {
  question: string
  answer: string
  grounded: boolean
  citations: Citation[]
  retrieval?: AppliedRetrieval | null
  warnings?: string[]
  explain?: RetrievalExplanation
}

/** com.shk.generic.retrieval.options.RetrievalCatalog.Option */
export interface CatalogOption {
  value: string
  enabled: boolean
  /** why it can't be used now, e.g. "COHERE_API_KEY is not set" */
  unavailableReason: string | null
  description: string
  cost: string
}

/** GET /api/search/modes */
export interface RetrievalCatalog {
  defaults: {
    mode: RetrievalMode
    queryTransform: QueryTransformType
    rerank: RerankerType
    diversify: DiversifierType
    topK: number
    candidatesWhenPooling: number
    minScore: number
    mmrLambda: number
    rrfK: number
  }
  limits: {
    maxTopK: number
    maxCandidates: number
    maxLlmCallsPerRequest: number
    llmTimeoutSeconds: number
    maxQueryChars: number
  }
  keywordEngine: string
  mode: CatalogOption[]
  queryTransform: CatalogOption[]
  rerank: CatalogOption[]
  diversify: CatalogOption[]
}

// ---------- evaluation (POST /api/admin/evaluation) ----------

export interface EvaluationRequest {
  /** ingest the bundled sample corpus first (idempotent) */
  seedCorpus?: boolean
  k?: number
  /** specs like "semantic", "hybrid+rerank:llm+mmr"; the first is the baseline */
  configurations?: string[]
  details?: boolean
}

export interface EvaluationQuestionResult {
  id: string
  hit: number
  recall: number
  reciprocalRank: number
  latencyMs: number
  topSources: string[]
  error: string | null
}

export interface EvaluationConfigResult {
  configuration: string
  hitRate: number
  recall: number
  mrr: number
  latencyMeanMs: number
  latencyP50Ms: number
  latencyP95Ms: number
  avgLlmCalls: number
  errors: number
  degraded: number
  /** this − baseline; null for the baseline */
  delta: { hitRate: number; recall: number; mrr: number; latencyP50Ms: number } | null
  perQuestion?: EvaluationQuestionResult[]
}

export interface EvaluationReport {
  goldenSet: string
  questions: number
  k: number
  baseline: string
  seeded: number
  results: EvaluationConfigResult[]
}

// ---------- documentation viewer (GET /api/docs) ----------

/** A page (slug and path set) or a section grouping pages. */
export interface DocsNavNode {
  title: string
  slug?: string
  /** site-relative file path, e.g. docs/api.md; relative links resolve against it */
  path?: string
  order: number
  /** heading id → live widget rendered after that heading */
  widgets?: Record<string, string>
  children?: DocsNavNode[]
}

export interface DocsIndex {
  /** slug of the home page */
  home: string
  pages: DocsNavNode[]
}

export interface DocPage {
  slug: string
  title: string
  path: string
  markdown: string
  lastModified: string
}

/** Spring ProblemDetail (RFC 9457), returned by every exception handler. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  /** "Invalid retrieval option" problems name the parameter and its valid values */
  parameter?: string
  validValues?: string[]
  [extra: string]: unknown
}
