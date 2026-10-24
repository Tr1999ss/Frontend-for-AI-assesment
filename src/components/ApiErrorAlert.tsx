import { ApiError } from '../api/client'
import { Alert, Tag } from '../ui'

/** Renders any thrown error; backend ProblemDetails show their status, title, detail and valid values. */
export function ApiErrorAlert({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!error) return null
  const { title, detail, validValues } = describeError(error)
  return (
    <Alert tone="danger" title={title} onDismiss={onDismiss}>
      {detail}
      {validValues && validValues.length > 0 && (
        <div className="cluster" style={{ gap: 4, marginTop: 6 }}>
          <span className="xsmall">Valid values:</span>
          {validValues.map((v) => (
            <Tag key={v}>{v}</Tag>
          ))}
        </div>
      )}
    </Alert>
  )
}

export function describeError(error: unknown): { title: string; detail?: string; validValues?: string[] } {
  if (error instanceof ApiError) {
    return {
      title: `${error.status} · ${error.problem.title ?? 'Request failed'}`,
      detail: error.problem.detail,
      validValues: Array.isArray(error.problem.validValues) ? error.problem.validValues : undefined,
    }
  }
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return { title: 'Backend unreachable', detail: 'Is the Spring Boot app running? Check the status badge in the top bar.' }
  }
  return { title: 'Something went wrong', detail: error instanceof Error ? error.message : String(error) }
}
