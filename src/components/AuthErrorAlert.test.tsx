import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { click, getButton, queryButton, render } from '../test/render'
import { AuthErrorAlert } from './AuthErrorAlert'

const login = vi.hoisted(() => vi.fn())
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ login }) }))

describe('AuthErrorAlert', () => {
  it('offers to sign in again on 401', async () => {
    const container = await render(<AuthErrorAlert error={new ApiError(401, { status: 401, title: 'Unauthorized' })} />)
    expect(container.textContent).toContain('Your session has expired')
    await click(getButton(container, 'Sign in again'))
    expect(login).toHaveBeenCalledOnce()
  })

  it('says the operation is admin only on 403', async () => {
    const container = await render(<AuthErrorAlert error={new ApiError(403, { status: 403, title: 'Forbidden' })} />)
    expect(container.textContent).toContain('Admin only')
    expect(container.textContent).toContain('kb-admin')
    expect(queryButton(container, 'Sign in again')).toBeNull()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('shows other errors with their problem detail', async () => {
    const container = await render(<AuthErrorAlert error={new ApiError(500, { status: 500, title: 'Internal Server Error', detail: 'boom' })} />)
    expect(container.textContent).toContain('500 · Internal Server Error')
    expect(container.textContent).toContain('boom')
  })

  it('renders nothing without an error', async () => {
    const container = await render(<AuthErrorAlert error={null} />)
    expect(container.textContent).toBe('')
  })
})
