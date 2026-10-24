import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Popover } from '../../ui'
import { optionLabel } from '../retrieval/catalog'
import { RetrievalFilters, type RetrievalFilterValues } from '../retrieval/RetrievalFilters'

/** "Filters" pill in the composer; opens the shared retrieval filters above it. */
export function ComposerTools({
  value,
  onChange,
  icon,
}: {
  value: RetrievalFilterValues
  onChange: (next: RetrievalFilterValues) => void
  icon: ReactNode
}) {
  const strategy = [
    value.mode && optionLabel(value.mode),
    value.queryTransform && value.queryTransform !== 'NONE' && optionLabel(value.queryTransform),
    value.rerank && value.rerank !== 'NONE' && `rerank ${optionLabel(value.rerank)}`,
    value.diversify === 'MMR' && 'MMR',
  ].filter(Boolean)
  const active = value.categories.length > 0 || value.scope !== 'ANY' || strategy.length > 0
  const summary = value.categories.length
    ? value.categories.length === 1
      ? value.categories[0]
      : `${value.categories.length} categories`
    : 'All categories'

  return (
    <Popover
      align="start"
      className="composer-filters"
      trigger={(props) => (
        <button type="button" className={cx('composer-pill', active && 'is-active')} {...props}>
          {icon}
          {summary}
          <span className="muted">
            · top {value.topK}
            {strategy.length > 0 && ` · ${strategy.join(' + ')}`}
          </span>
        </button>
      )}
    >
      <RetrievalFilters value={value} onChange={onChange} />
    </Popover>
  )
}
