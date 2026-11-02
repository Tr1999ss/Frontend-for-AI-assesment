import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/render'
import { a2aTask, raceReport } from '../test/fixtures'
import { api, ApiError, configureApiAuth } from './client'

const TOKEN = 'secret-access-token'

describe('api client: race and A2A', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    configureApiAuth(async () => TOKEN)
  })
  afterEach(() => configureApiAuth(async () => null))

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    return { url, init, headers: new Headers(init.headers) }
  }

  it('posts the race request with the bearer token and the abort signal', async () => {
    fetchMock.mockResolvedValue(jsonResponse(raceReport()))
    const signal = new AbortController().signal

    const report = await api.admin.race({ repetitions: 2, limitQuestions: 5 }, signal)

    const { url, init, headers } = lastCall()
    expect(url).toBe('/api/admin/race')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ repetitions: 2, limitQuestions: 5 })
    expect(headers.get('Authorization')).toBe(`Bearer ${TOKEN}`)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.signal).toBe(signal)
    expect(report.raceName).toBe('race-questions')
  })

  it('reads the saved race, and treats 204 as "no race yet"', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(raceReport()))
    expect((await api.admin.latestRace())?.totalQuestions).toBe(1)
    expect(lastCall().url).toBe('/api/admin/race/latest')

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    expect(await api.admin.latestRace()).toBeUndefined()
  })

  it('creates and fetches A2A tasks', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(a2aTask({ state: 'working' }), 201))
    const created = await api.a2a.createTask('What is ERR-4012?')
    expect(created.state).toBe('working')
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ input: 'What is ERR-4012?' })

    fetchMock.mockResolvedValueOnce(jsonResponse(a2aTask()))
    await api.a2a.getTask('id with/slash')
    expect(lastCall().url).toBe('/api/a2a/tasks/id%20with%2Fslash')
  })

  it('fetches the agent card from the well-known path', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ name: 'x', description: '', url: '', version: '1' }))
    await api.a2a.agentCard()
    expect(lastCall().url).toBe('/.well-known/agent-card.json')
  })

  it.each([401, 403])('turns a %i problem detail into an ApiError that never contains the token', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ title: status === 401 ? 'Unauthorized' : 'Forbidden', status, detail: 'nope' }, status, 'application/problem+json'))

    const error = await api.admin.race({}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(status)
    expect(JSON.stringify(error)).not.toContain(TOKEN)
    expect(String((error as ApiError).message)).not.toContain(TOKEN)
  })

  it('rejects with an AbortError when the race is cancelled', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          // like real fetch: an already-aborted signal rejects at once
          const abort = () => reject(new DOMException('aborted', 'AbortError'))
          if (init.signal?.aborted) abort()
          else init.signal?.addEventListener('abort', abort)
        }),
    )
    const controller = new AbortController()
    const pending = api.admin.race({}, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
