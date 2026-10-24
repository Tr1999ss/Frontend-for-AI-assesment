import { useState, type KeyboardEvent } from 'react'
import { cx } from '../lib/cx'
import { Tag } from './Chip'
import { useFieldControl } from './Field'
import './tag-input.css'

export interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

/** Free-form list entry: Enter or comma adds, Backspace on empty removes the last tag. */
export function TagInput({ value, onChange, placeholder = 'Type and press Enter', className }: TagInputProps) {
  const field = useFieldControl()
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (items.length) onChange([...value, ...items.filter((i) => !value.includes(i))])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cx('control tag-input', className)}>
      {value.map((item) => (
        <Tag key={item} onRemove={() => onChange(value.filter((v) => v !== item))}>
          {item}
        </Tag>
      ))}
      <input
        id={field?.id}
        aria-describedby={field?.describedBy}
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && commit(draft)}
      />
    </div>
  )
}
