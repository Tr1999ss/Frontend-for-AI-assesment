import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button, EmptyState } from '../ui'

interface State {
  error: Error | null
}

/** Keeps one broken page (or a failed chunk load) from blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page">
        <EmptyState
          icon={<TriangleAlert />}
          title="This page hit an error"
          description={this.state.error.message}
          action={
            <Button icon={<RefreshCw />} onClick={() => window.location.reload()}>
              Reload
            </Button>
          }
        />
      </div>
    )
  }
}
