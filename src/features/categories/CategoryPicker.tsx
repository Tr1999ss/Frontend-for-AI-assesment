import { Sparkles } from 'lucide-react'
import { Button, Chip, Skeleton } from '../../ui'
import { useActiveCategories } from './activeCategories'
import './categories.css'

interface CategoryPickerProps {
  value: string[]
  onChange: (next: string[]) => void
}

/**
 * Ordered multi-select over the active categories. Order matters to the backend: the first
 * pick is the primary category. Nothing picked means the AI classifier decides.
 */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { data: categories, loading, error, reload } = useActiveCategories()
  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name])

  return (
    <div className="category-picker">
      <div className="category-picker-chips">
        {loading && !categories && [72, 64, 88, 58, 70].map((w, i) => <Skeleton key={i} width={w} height={30} radius="999px" />)}
        {categories?.map((c) => {
          const rank = value.indexOf(c.name)
          return (
            <Chip
              key={c.name}
              selected={rank >= 0}
              marker={rank === 0 ? '★' : rank + 1}
              title={c.description}
              onClick={() => toggle(c.name)}
            >
              {c.name}
            </Chip>
          )
        })}
        {error != null && (
          <span className="small muted">
            Couldn't load categories.{' '}
            <Button variant="ghost" size="sm" onClick={reload}>
              Retry
            </Button>
          </span>
        )}
      </div>
      <div className="category-picker-hint">
        {value.length === 0 ? (
          <>
            <Sparkles size={13} /> AI will classify automatically
          </>
        ) : (
          <>
            <span>
              Primary: <strong>{value[0]}</strong>
              {value.length > 1 && ` + ${value.length - 1} more`}
            </span>
            <button type="button" className="link-button" onClick={() => onChange([])}>
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  )
}
