import type { McpTool } from '../../api/mcp'
import { Field } from '../../ui'
import { resolveFieldRenderer } from './fields/registry'
import { schemaType } from './schema'

interface SchemaFormProps {
  tool: McpTool
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  missing: string[]
}

/** One field per input-schema property; the field registry decides how each is edited. */
export function SchemaForm({ tool, values, onChange, missing }: SchemaFormProps) {
  const properties = Object.entries(tool.inputSchema.properties ?? {})
  const required = new Set(tool.inputSchema.required ?? [])

  if (properties.length === 0) return <p className="small muted">This tool takes no arguments.</p>

  // required parameters first, then the rest in schema order
  const ordered = [...properties.filter(([n]) => required.has(n)), ...properties.filter(([n]) => !required.has(n))]

  return (
    <div className="stack">
      {ordered.map(([name, schema]) => {
        const context = { toolName: tool.name, name, schema, required: required.has(name) }
        const { Component } = resolveFieldRenderer(context)
        return (
          <Field
            key={name}
            label={<span className="mono">{name}</span>}
            required={context.required}
            trailing={schemaType(schema)}
            hint={schema.description}
            error={missing.includes(name) ? 'Required' : undefined}
          >
            <Component {...context} value={values[name]} onChange={(v) => onChange({ ...values, [name]: v })} />
          </Field>
        )
      })}
    </div>
  )
}
