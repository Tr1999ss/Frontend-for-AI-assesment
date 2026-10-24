import { Coins, Microscope } from 'lucide-react'
import type {
  CategoryScope,
  DiversifierType,
  QueryTransformType,
  RerankerType,
  RetrievalCatalog,
  RetrievalMode,
  RetrievalOptions,
} from '../../api/types'
import { Field, Segmented, Select, Skeleton, Slider, Switch } from '../../ui'
import { CategoryPicker } from '../categories/CategoryPicker'
import { findOption, optionLabel, useRetrievalCatalog } from './catalog'

/** Filters plus retrieval strategy. Strategy fields left undefined use the server defaults. */
export interface RetrievalFilterValues extends RetrievalOptions {
  categories: string[]
  scope: CategoryScope
  topK: number
  /** search only: cosine floor for the semantic leg */
  minScore?: number
  explain: boolean
}

export const DEFAULT_FILTERS: RetrievalFilterValues = { categories: [], scope: 'ANY', topK: 5, explain: false }

/** Fills fields added since the values were saved in the browser. */
export function withDefaults(stored: Partial<RetrievalFilterValues>): RetrievalFilterValues {
  return { ...DEFAULT_FILTERS, ...stored }
}

/** Request fields for /api/search and /api/ask; unset options are omitted so server defaults apply. */
export function toRequest(v: RetrievalFilterValues) {
  return {
    categories: v.categories.length ? v.categories : undefined,
    scope: v.scope,
    topK: v.topK,
    mode: v.mode,
    queryTransform: v.queryTransform,
    rerank: v.rerank,
    diversify: v.diversify,
    candidates: isPooling(v) ? v.candidates : undefined,
    mmrLambda: v.diversify === 'MMR' ? v.mmrLambda : undefined,
    explain: v.explain || undefined,
  }
}

/** Fusion, reranking and MMR work on a candidate pool larger than topK. */
function isPooling(v: RetrievalFilterValues): boolean {
  return v.mode === 'HYBRID' || (v.rerank != null && v.rerank !== 'NONE') || v.diversify === 'MMR'
}

const hasStrategy = (v: RetrievalFilterValues) =>
  v.mode != null || v.queryTransform != null || v.rerank != null || v.diversify != null || v.candidates != null || v.mmrLambda != null || v.minScore != null

interface RetrievalFiltersProps {
  value: RetrievalFilterValues
  onChange: (next: RetrievalFilterValues) => void
  showTopK?: boolean
  showMinScore?: boolean
}

/** Category, scope and count filters plus the retrieval strategy, shared by Search, Ask and their popovers. */
export function RetrievalFilters({ value, onChange, showTopK = true, showMinScore = false }: RetrievalFiltersProps) {
  const catalog = useRetrievalCatalog()
  const set = (patch: Partial<RetrievalFilterValues>) => onChange({ ...value, ...patch })
  const maxTopK = catalog.data?.limits.maxTopK ?? 20

  return (
    <div className="stack retrieval-filters">
      <Field label="Categories" hint={value.categories.length ? undefined : 'All categories'}>
        <CategoryPicker value={value.categories} onChange={(categories) => set({ categories })} />
      </Field>
      <Field label="Match" hint={value.scope === 'ANY' ? 'Tagged with any selected category' : 'Primary category is a selected one'}>
        <Segmented
          block
          size="sm"
          value={value.scope}
          onChange={(scope) => set({ scope })}
          aria-label="Category scope"
          options={[
            { value: 'ANY', label: 'Any tag' },
            { value: 'PRIMARY', label: 'Primary only' },
          ]}
        />
      </Field>
      {showTopK && (
        <Field label="Results">
          <Slider min={1} max={maxTopK} value={Math.min(value.topK, maxTopK)} onChange={(topK) => set({ topK })} format={(k) => `top ${k}`} />
        </Field>
      )}

      <div className="filters-divider">
        <span>Strategy</span>
        {hasStrategy(value) && (
          <button
            type="button"
            className="link-button xsmall"
            onClick={() => set({ mode: undefined, queryTransform: undefined, rerank: undefined, diversify: undefined, candidates: undefined, mmrLambda: undefined, minScore: undefined })}
          >
            Use defaults
          </button>
        )}
      </div>

      {catalog.loading && !catalog.data && (
        <div className="stack" style={{ ['--gap' as string]: '10px' }}>
          <Skeleton height={30} />
          <Skeleton height={30} />
          <Skeleton height={30} />
        </div>
      )}
      {catalog.error != null && !catalog.data && <p className="xsmall muted">Strategy options are unavailable from this backend.</p>}
      {catalog.data && <StrategyControls catalog={catalog.data} value={value} set={set} showMinScore={showMinScore} />}
    </div>
  )
}

function StrategyControls({
  catalog,
  value,
  set,
  showMinScore,
}: {
  catalog: RetrievalCatalog
  value: RetrievalFilterValues
  set: (patch: Partial<RetrievalFilterValues>) => void
  showMinScore: boolean
}) {
  const { defaults, limits } = catalog
  const mode = value.mode ?? defaults.mode
  const transform = value.queryTransform ?? defaults.queryTransform
  const rerank = value.rerank ?? defaults.rerank
  const diversify = value.diversify ?? defaults.diversify
  const effective = { ...value, mode, rerank, diversify }
  const pooling = isPooling(effective)

  const selected = [
    findOption(catalog.mode, mode),
    findOption(catalog.queryTransform, transform),
    findOption(catalog.rerank, rerank),
    findOption(catalog.diversify, diversify),
  ].filter((o) => o && o.value !== 'NONE' && o.cost)

  return (
    <>
      <Field label="Mode" hint={findOption(catalog.mode, mode)?.description}>
        <Segmented
          block
          size="sm"
          value={mode}
          onChange={(m) => set({ mode: m as RetrievalMode })}
          aria-label="Retrieval mode"
          options={catalog.mode.map((o) => ({
            value: o.value,
            label: optionLabel(o.value),
            disabled: !o.enabled,
            title: o.unavailableReason ?? o.description,
          }))}
        />
      </Field>

      <Field label="Query transform" hint={findOption(catalog.queryTransform, transform)?.description}>
        <OptionSelect options={catalog.queryTransform} value={transform} onChange={(v) => set({ queryTransform: v as QueryTransformType })} />
      </Field>

      <Field label="Rerank" hint={findOption(catalog.rerank, rerank)?.description}>
        <OptionSelect options={catalog.rerank} value={rerank} onChange={(v) => set({ rerank: v as RerankerType })} />
      </Field>

      <Field hint={diversify === 'MMR' ? 'Trades a little relevance for less repetitive results.' : undefined}>
        <Switch
          checked={diversify === 'MMR'}
          onChange={(on) => set({ diversify: (on ? 'MMR' : 'NONE') as DiversifierType })}
          label="Diversify results (MMR)"
        />
      </Field>
      {diversify === 'MMR' && (
        <Field label="Relevance vs. diversity" hint="1 = pure relevance, 0 = pure diversity">
          <Slider min={0} max={1} step={0.05} value={value.mmrLambda ?? defaults.mmrLambda} onChange={(mmrLambda) => set({ mmrLambda })} format={(n) => n.toFixed(2)} />
        </Field>
      )}

      {pooling && (
        <Field label="Candidate pool" hint="Chunks gathered before fusion, reranking or MMR pick the top results.">
          <Slider
            min={value.topK}
            max={limits.maxCandidates}
            value={Math.max(value.topK, value.candidates ?? defaults.candidatesWhenPooling)}
            onChange={(candidates) => set({ candidates })}
          />
        </Field>
      )}

      {showMinScore && mode !== 'KEYWORD' && (
        <Field label="Minimum similarity" hint="Cosine floor for the semantic leg only.">
          <Slider min={0} max={0.9} step={0.05} value={value.minScore ?? defaults.minScore} onChange={(minScore) => set({ minScore })} format={(n) => n.toFixed(2)} />
        </Field>
      )}

      <Field hint="Adds per-stage ranks, scores and timings to the results.">
        <Switch checked={value.explain} onChange={(explain) => set({ explain })} label={<span className="cluster" style={{ gap: 6 }}><Microscope size={14} /> Explain ranking</span>} />
      </Field>

      {selected.length > 0 && (
        <div className="cost-note">
          <Coins size={14} />
          <div>
            {selected.map((o) => (
              <div key={o!.value}>
                <strong>{optionLabel(o!.value)}:</strong> {o!.cost}
              </div>
            ))}
            <div className="muted">Up to {limits.maxLlmCallsPerRequest} LLM calls per request, {limits.llmTimeoutSeconds}s timeout.</div>
          </div>
        </div>
      )}
    </>
  )
}

function OptionSelect({ options, value, onChange }: { options: RetrievalCatalog['rerank']; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={!o.enabled} title={o.unavailableReason ?? undefined}>
          {optionLabel(o.value)}
          {!o.enabled ? ` (unavailable: ${o.unavailableReason ?? 'not configured'})` : ''}
        </option>
      ))}
    </Select>
  )
}
