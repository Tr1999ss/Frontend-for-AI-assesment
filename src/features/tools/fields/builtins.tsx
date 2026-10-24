import { useState } from 'react'
import { FileCheck2, X } from 'lucide-react'
import { formatBytes } from '../../../lib/format'
import { Button, Dropzone, Input, Select, Switch, TagInput, Textarea } from '../../../ui'
import { CategoryPicker } from '../../categories/CategoryPicker'
import { schemaType } from '../schema'
import type { FieldRenderer, FieldRendererProps } from './registry'

// Default editors for MCP tool parameters, most specific first. Order matters.

const asString = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const asList = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])

function CategoriesField({ value, onChange }: FieldRendererProps) {
  return <CategoryPicker value={asList(value)} onChange={onChange} />
}

function Base64FileField({ value, onChange }: FieldRendererProps) {
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const encoded = asString(value)

  const load = async ([picked]: File[]) => {
    const bytes = new Uint8Array(await picked.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    setFile({ name: picked.name, size: picked.size })
    onChange(btoa(binary))
  }

  if (encoded) {
    return (
      <div className="encoded-file">
        <FileCheck2 size={18} />
        <div className="grow">
          <div className="truncate">{file?.name ?? 'Pasted base64'}</div>
          <div className="xsmall muted">
            {file ? formatBytes(file.size) : `${encoded.length.toLocaleString()} chars`} · base64 encoded
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<X />}
          aria-label="Remove file"
          onClick={() => {
            setFile(null)
            onChange('')
          }}
        />
      </div>
    )
  }
  return <Dropzone compact multiple={false} onFiles={load} title="Choose a file to encode" hint="Converted to base64 in the browser" />
}

function EnumField({ schema, value, onChange }: FieldRendererProps) {
  return (
    <Select value={asString(value)} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">—</option>
      {schema.enum!.map((option) => (
        <option key={String(option)} value={String(option)}>
          {String(option)}
        </option>
      ))}
    </Select>
  )
}

function BooleanField({ name, value, onChange }: FieldRendererProps) {
  return <Switch checked={value === true} onChange={onChange} label={value === true ? 'true' : 'false'} aria-label={name} />
}

function NumberField({ schema, value, onChange }: FieldRendererProps) {
  return (
    <Input
      type="number"
      step={schemaType(schema) === 'integer' ? 1 : 'any'}
      value={asString(value)}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  )
}

function ListField({ value, onChange }: FieldRendererProps) {
  return <TagInput value={asList(value)} onChange={onChange} />
}

function LongTextField({ value, onChange }: FieldRendererProps) {
  return <Textarea autoGrow rows={4} maxRows={14} value={asString(value)} onChange={(e) => onChange(e.target.value)} />
}

function JsonField({ value, onChange }: FieldRendererProps) {
  const [draft, setDraft] = useState(() => (value === undefined ? '' : JSON.stringify(value, null, 2)))
  return (
    <Textarea
      className="mono"
      rows={4}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        try {
          onChange(e.target.value.trim() ? JSON.parse(e.target.value) : undefined)
        } catch {
          // keep the last valid value until the JSON parses
        }
      }}
    />
  )
}

function TextField({ value, onChange }: FieldRendererProps) {
  return <Input value={asString(value)} onChange={(e) => onChange(e.target.value)} />
}

const LONG_TEXT_NAMES = /^(text|content|body|question|query|prompt|message)$/i

export const builtinFieldRenderers: FieldRenderer[] = [
  { id: 'categories', matches: (c) => c.name === 'categories' && schemaType(c.schema) === 'array', Component: CategoriesField },
  {
    id: 'base64',
    matches: (c) => schemaType(c.schema) === 'string' && (/base64/i.test(c.name) || /base64/i.test(c.schema.description ?? '')),
    Component: Base64FileField,
  },
  { id: 'enum', matches: (c) => Array.isArray(c.schema.enum), Component: EnumField },
  { id: 'boolean', matches: (c) => schemaType(c.schema) === 'boolean', Component: BooleanField },
  { id: 'number', matches: (c) => ['number', 'integer'].includes(schemaType(c.schema) ?? ''), Component: NumberField },
  { id: 'list', matches: (c) => schemaType(c.schema) === 'array', Component: ListField },
  { id: 'object', matches: (c) => schemaType(c.schema) === 'object', Component: JsonField },
  { id: 'long-text', matches: (c) => schemaType(c.schema) === 'string' && LONG_TEXT_NAMES.test(c.name), Component: LongTextField },
  { id: 'text', matches: () => true, Component: TextField },
]
