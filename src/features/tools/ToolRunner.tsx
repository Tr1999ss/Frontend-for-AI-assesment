import { useState, type FormEvent } from 'react'
import { Braces, FormInput, Play, RotateCcw, Wrench } from 'lucide-react'
import type { McpTool } from '../../api/mcp'
import { Button, Card, CardHeader, Field, Segmented, Textarea } from '../../ui'
import { SchemaForm } from './SchemaForm'
import { missingRequired, toArguments } from './schema'

type Mode = 'form' | 'json'

interface ToolRunnerProps {
  tool: McpTool
  busy: boolean
  disabled: boolean
  onRun: (args: Record<string, unknown>) => void
}

export function ToolRunner({ tool, busy, disabled, onRun }: ToolRunnerProps) {
  const [mode, setMode] = useState<Mode>('form')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [json, setJson] = useState('{}')
  const [jsonError, setJsonError] = useState<string>()
  const [missing, setMissing] = useState<string[]>([])

  const switchMode = (next: Mode) => {
    if (next === 'json') {
      setJson(JSON.stringify(toArguments(values), null, 2))
      setJsonError(undefined)
    } else {
      try {
        setValues(JSON.parse(json || '{}'))
      } catch {
        setJsonError('Fix the JSON before switching back to the form')
        return
      }
    }
    setMode(next)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    let args: Record<string, unknown>
    if (mode === 'json') {
      try {
        args = JSON.parse(json || '{}')
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
        return
      }
    } else {
      args = toArguments(values)
    }
    const absent = missingRequired(tool.inputSchema, args)
    setMissing(absent)
    if (absent.length === 0) onRun(args)
  }

  return (
    <Card className="tool-runner">
      <CardHeader
        icon={<Wrench />}
        title={<span className="mono">{tool.name}</span>}
        description={tool.description}
        actions={
          <Segmented
            size="sm"
            value={mode}
            onChange={switchMode}
            aria-label="Input mode"
            options={[
              { value: 'form', icon: <FormInput />, title: 'Form' },
              { value: 'json', icon: <Braces />, title: 'JSON' },
            ]}
          />
        }
      />
      <form
        className="stack"
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e)
        }}
      >
        <div key={mode} className="tool-runner-body">
          {mode === 'form' ? (
            <SchemaForm tool={tool} values={values} onChange={setValues} missing={missing} />
          ) : (
            <Field label="Arguments" error={jsonError ?? (missing.length ? `Missing: ${missing.join(', ')}` : undefined)}>
              <Textarea className="mono" rows={14} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
            </Field>
          )}
        </div>
        <div className="form-actions">
          <span className="xsmall muted">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run
          </span>
          <Button
            variant="ghost"
            icon={<RotateCcw />}
            onClick={() => {
              setValues({})
              setJson('{}')
              setMissing([])
            }}
          >
            Reset
          </Button>
          <Button type="submit" variant="primary" icon={<Play />} loading={busy} disabled={disabled}>
            Run tool
          </Button>
        </div>
      </form>
    </Card>
  )
}
