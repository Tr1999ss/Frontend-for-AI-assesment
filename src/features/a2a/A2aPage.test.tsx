import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../api/client'
import { a2aTask, agentCard } from '../../test/fixtures'
import { click, flush, getButton, render, submit, typeInto } from '../../test/render'
import { A2aPage } from './A2aPage'

vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ login: vi.fn() }) }))

const renderPage = async () => {
  const container = await render(<A2aPage />)
  await flush()
  return container
}

const stepStates = (c: HTMLElement) => [...c.querySelectorAll('.a2a-step')].map((li) => `${li.querySelector('.a2a-step-label')?.firstChild?.textContent}:${li.className.split('is-')[1]}`)

describe('A2aPage', () => {
  beforeEach(() => localStorage.clear())

  it('shows the agent card: name, version, capabilities and skills', async () => {
    vi.spyOn(api.a2a, 'agentCard').mockResolvedValue(agentCard)
    const c = await renderPage()

    expect(c.textContent).toContain('code-and-config-specialist')
    expect(c.textContent).toContain('v1.0.0')
    expect(c.textContent).toContain('Finds exact commands and settings.')
    expect(c.textContent).toContain('State transition history: supported')
    expect(c.textContent).toContain('Streaming: not supported')
    expect(c.textContent).toContain('Code & Configuration Lookup')
    expect(c.textContent).toContain('runbooks')
  })

  it('shows the card error without blocking the task console', async () => {
    vi.spyOn(api.a2a, 'agentCard').mockRejectedValue(new ApiError(502, { status: 502, title: 'Bad Gateway' }))
    const c = await renderPage()
    expect(c.textContent).toContain('502 · Bad Gateway')
    expect(c.querySelector('textarea')).not.toBeNull()
  })

  it('submits a task and shows the timeline, output, tokens and latency', async () => {
    vi.spyOn(api.a2a, 'agentCard').mockResolvedValue(agentCard)
    const create = vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask())
    const c = await renderPage()

    await typeInto(c.querySelector('textarea')!, 'What is ERR-4012?')
    await submit(c.querySelector('form')!)
    await flush()

    expect(create).toHaveBeenCalledWith('What is ERR-4012?', expect.any(AbortSignal))
    expect(stepStates(c)).toEqual(['Submitted:done', 'Working:done', 'Completed:done'])
    expect(c.querySelector('.a2a-output strong')?.textContent).toBe('gateway timeout')
    expect(c.textContent).toContain('405') // total tokens
    expect(c.textContent).toContain('1.42 s')
    expect(c.textContent).toContain('task-1')
  })

  it('shows a failed task with its error', async () => {
    vi.spyOn(api.a2a, 'agentCard').mockResolvedValue(agentCard)
    vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask({ state: 'failed', output: undefined, error: 'Model unavailable' }))
    const c = await renderPage()

    await typeInto(c.querySelector('textarea')!, 'x')
    await submit(c.querySelector('form')!)
    await flush()

    expect(stepStates(c)).toEqual(['Submitted:done', 'Working:done', 'Failed:failed'])
    expect(c.textContent).toContain('Model unavailable')
  })

  it('disables the form while a task is running and can cancel it', async () => {
    vi.spyOn(api.a2a, 'agentCard').mockResolvedValue(agentCard)
    let signal: AbortSignal | undefined
    vi.spyOn(api.a2a, 'createTask').mockImplementation(
      (_input, s) =>
        new Promise((_, reject) => {
          signal = s
          s?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const c = await renderPage()

    await typeInto(c.querySelector('textarea')!, 'x')
    await submit(c.querySelector('form')!)
    expect(c.querySelector('textarea')!.disabled).toBe(true)
    expect(stepStates(c)[0]).toBe('Submitted:current')

    await click(getButton(c, 'Cancel'))
    await flush()
    expect(signal?.aborted).toBe(true)
    expect(c.textContent).toContain('Stopped waiting')
    expect(c.querySelector('textarea')!.disabled).toBe(false)
  })

  it('asks to sign in again on 401 and says admin only on 403', async () => {
    vi.spyOn(api.a2a, 'agentCard').mockResolvedValue(agentCard)
    const create = vi.spyOn(api.a2a, 'createTask').mockRejectedValueOnce(new ApiError(401, { status: 401 }))
    const c = await renderPage()

    await typeInto(c.querySelector('textarea')!, 'x')
    await submit(c.querySelector('form')!)
    await flush()
    expect(c.textContent).toContain('Your session has expired')

    create.mockRejectedValueOnce(new ApiError(403, { status: 403 }))
    await submit(c.querySelector('form')!)
    await flush()
    expect(c.textContent).toContain('Admin only')
  })

  it('refreshes a finished task with tasks/get and notices when the server forgot it', async () => {
    vi.spyOn(api.a2a, 'agentCard').mockResolvedValue(agentCard)
    vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask())
    const get = vi.spyOn(api.a2a, 'getTask').mockRejectedValue(new ApiError(404, { status: 404 }))
    const c = await renderPage()

    await typeInto(c.querySelector('textarea')!, 'x')
    await submit(c.querySelector('form')!)
    await flush()
    await click(getButton(c, 'Refresh'))
    await flush()

    expect(get).toHaveBeenCalledWith('task-1')
    expect(c.textContent).toContain('No longer on the server')
  })
})
