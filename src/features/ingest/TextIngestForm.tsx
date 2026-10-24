import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { api } from '../../api/client'
import type { IngestionResult, SourceFormat } from '../../api/types'
import { ApiErrorAlert } from '../../components/ApiErrorAlert'
import { useAction } from '../../lib/hooks'
import { Button, Disclosure, Field, Input, Segmented, Textarea, useToast } from '../../ui'
import { CategoryPicker } from '../categories/CategoryPicker'

type FormatChoice = 'AUTO' | Exclude<SourceFormat, 'PDF' | 'UNKNOWN'>

const FORMAT_OPTIONS: { value: FormatChoice; label: string }[] = [
  { value: 'AUTO', label: 'Detect' },
  { value: 'MARKDOWN', label: 'Markdown' },
  { value: 'JSON', label: 'JSON' },
  { value: 'TEXT', label: 'Text' },
]

export function TextIngestForm({ onIngested }: { onIngested: (result: IngestionResult) => void }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [format, setFormat] = useState<FormatChoice>('AUTO')
  const [categories, setCategories] = useState<string[]>([])
  const [attributes, setAttributes] = useState('')
  const toast = useToast()

  const attributesError = (() => {
    if (!attributes.trim()) return undefined
    try {
      const parsed = JSON.parse(attributes)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? undefined : 'Must be a JSON object'
    } catch {
      return 'Not valid JSON'
    }
  })()

  const ingest = useAction(async () => {
    const result = await api.ingestText({
      title: title.trim(),
      text,
      format: format === 'AUTO' ? undefined : format,
      categories: categories.length ? categories : undefined,
      attributes: attributes.trim() ? JSON.parse(attributes) : undefined,
    })
    onIngested(result)
    toast.success(result.status === 'DUPLICATE' ? 'Already in the knowledge base' : 'Text ingested', result.filename)
    setTitle('')
    setText('')
    return result
  })

  const canSubmit = title.trim() && text.trim() && !attributesError && !ingest.busy

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (canSubmit) ingest.run()
  }

  return (
    <form
      className="stack"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e)
      }}
    >
      <div className="form-grid">
        <Field label="Title" required hint="Include an extension to hint the format, e.g. leave-policy.md">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="leave-policy.md" />
        </Field>
        <Field label="Format">
          <Segmented block options={FORMAT_OPTIONS} value={format} onChange={setFormat} aria-label="Format" />
        </Field>
      </div>

      <Field label="Content" required trailing={`${text.length.toLocaleString()} chars`}>
        <Textarea
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={format === 'JSON' ? 'mono' : undefined}
          placeholder="Paste Markdown, JSON or plain text…"
        />
      </Field>

      <Field label="Categories">
        <CategoryPicker value={categories} onChange={setCategories} />
      </Field>

      <Disclosure summary="Advanced: metadata attributes">
        <Field label="Attributes" error={attributesError} hint="Optional JSON object stored with every chunk.">
          <Textarea
            rows={3}
            className="mono"
            value={attributes}
            onChange={(e) => setAttributes(e.target.value)}
            placeholder='{"author": "hr-team", "version": 3}'
          />
        </Field>
      </Disclosure>

      <ApiErrorAlert error={ingest.error} onDismiss={ingest.clearError} />

      <div className="form-actions">
        <span className="xsmall muted">
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit
        </span>
        <Button type="submit" variant="primary" icon={<Send />} loading={ingest.busy} disabled={!canSubmit}>
          Ingest text
        </Button>
      </div>
    </form>
  )
}
