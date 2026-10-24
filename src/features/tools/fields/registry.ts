import type { ComponentType } from 'react'
import type { JsonSchema } from '../../../api/mcp'
import { builtinFieldRenderers } from './builtins'

export interface FieldContext {
  toolName: string
  name: string
  schema: JsonSchema
  required: boolean
}

export interface FieldRendererProps extends FieldContext {
  value: unknown
  onChange: (value: unknown) => void
}

/**
 * How one tool parameter is edited. The first renderer whose matches() returns true wins,
 * so register specific renderers (one tool, one parameter name) ahead of generic ones.
 */
export interface FieldRenderer {
  id: string
  matches: (context: FieldContext) => boolean
  Component: ComponentType<FieldRendererProps>
}

const renderers: FieldRenderer[] = [...builtinFieldRenderers]

/** Adds a renderer with priority over everything registered before it. */
export function registerFieldRenderer(renderer: FieldRenderer) {
  renderers.unshift(renderer)
}

export function resolveFieldRenderer(context: FieldContext): FieldRenderer {
  // the last builtin matches everything, so this always finds one
  return renderers.find((r) => r.matches(context))!
}
