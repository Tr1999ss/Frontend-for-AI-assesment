import type { JsonSchema } from '../../api/mcp'

export function schemaType(schema: JsonSchema): string | undefined {
  return Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/** Drops empty values so optional parameters stay unset rather than being sent as "". */
export function toArguments(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => !isEmpty(v)))
}

export function missingRequired(schema: JsonSchema, values: Record<string, unknown>): string[] {
  return (schema.required ?? []).filter((name) => isEmpty(values[name]))
}

/** Text content from a tool result, parsed as JSON when it is JSON. */
export function parseContent(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
