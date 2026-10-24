import type { CatalogOption, RetrievalCatalog } from '../../api/types'
import { Badge } from '../../ui'
import { optionLabel } from './catalog'
import './retrieval.css'

const GROUPS: { key: 'mode' | 'queryTransform' | 'rerank' | 'diversify'; label: string }[] = [
  { key: 'mode', label: 'Mode' },
  { key: 'queryTransform', label: 'Query transform' },
  { key: 'rerank', label: 'Rerank' },
  { key: 'diversify', label: 'Diversify' },
]

/** Every retrieval option with availability, defaults and limits (GET /api/search/modes, list_retrieval_options). */
export function CatalogView({ catalog }: { catalog: RetrievalCatalog }) {
  const { defaults, limits } = catalog
  return (
    <div className="catalog">
      <div className="catalog-summary">
        <span>
          Keyword engine <strong>{optionLabel(catalog.keywordEngine)}</strong>
        </span>
        <span>
          top {defaults.topK} (max {limits.maxTopK})
        </span>
        <span>
          pool {defaults.candidatesWhenPooling} (max {limits.maxCandidates})
        </span>
        <span>min similarity {defaults.minScore}</span>
        <span>
          ≤ {limits.maxLlmCallsPerRequest} LLM calls, {limits.llmTimeoutSeconds}s
        </span>
      </div>
      {GROUPS.map(({ key, label }) => (
        <section key={key} className="catalog-group">
          <h4 className="catalog-group-title">{label}</h4>
          <ul className="catalog-options">
            {catalog[key].map((o) => (
              <CatalogRow key={o.value} option={o} isDefault={defaults[key] === o.value} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function CatalogRow({ option, isDefault }: { option: CatalogOption; isDefault: boolean }) {
  return (
    <li className={option.enabled ? 'catalog-option' : 'catalog-option is-disabled'}>
      <div className="cluster" style={{ gap: 6 }}>
        <strong>{optionLabel(option.value)}</strong>
        {isDefault && <Badge tone="accent">default</Badge>}
        {!option.enabled && <Badge tone="warning">unavailable</Badge>}
      </div>
      <p className="small subtle">{option.description}</p>
      {option.cost && <p className="xsmall muted">Cost: {option.cost}</p>}
      {option.unavailableReason && <p className="xsmall catalog-reason">{option.unavailableReason}</p>}
    </li>
  )
}
