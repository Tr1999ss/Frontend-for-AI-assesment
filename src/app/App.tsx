import { Suspense } from 'react'
import { AuthProvider } from '../auth/AuthProvider'
import { RequireRole } from '../auth/RequireRole'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PageFallback } from '../components/PageFallback'
import { AppShell } from '../layout/AppShell'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ConfirmProvider, ToastProvider } from '../ui'
import { useHashRoute } from './useHashRoute'

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routed />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

function Routed() {
  const route = useHashRoute()
  const Page = route.component
  return (
    <AppShell route={route}>
      <ErrorBoundary key={route.id}>
        <Suspense fallback={<PageFallback />}>
          <div className={route.layout === 'full' ? 'page-full page-enter' : 'page page-enter'}>
            <RequireRole access={route.access}>
              <Page />
            </RequireRole>
          </div>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  )
}
