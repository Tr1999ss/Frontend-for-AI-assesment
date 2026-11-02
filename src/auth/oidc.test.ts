import { describe, expect, it, vi } from 'vitest'

const callback = vi.hoisted(() => vi.fn())
vi.mock('oidc-client-ts', () => ({
  UserManager: class {
    signinRedirectCallback = callback
  },
}))

describe('completeSignin', () => {
  it('exchanges the code once, even when called twice, and returns to the starting page', async () => {
    callback.mockResolvedValue({ state: { hash: '#race' } })
    window.history.replaceState(null, '', '/?code=abc&state=xyz')
    const onHashChange = vi.fn()
    window.addEventListener('hashchange', onHashChange)
    const { completeSignin } = await import('./oidc')

    const [first, second] = await Promise.all([completeSignin(), completeSignin()])

    expect(callback).toHaveBeenCalledOnce()
    expect(second).toBe(first)
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#race')
    expect(onHashChange).toHaveBeenCalledOnce()
    window.removeEventListener('hashchange', onHashChange)
  })
})
