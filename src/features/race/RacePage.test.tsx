import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../api/client'
import type { RaceReport } from '../../api/types'
import { raceReport } from '../../test/fixtures'
import { click, flush, getButton, render, submit, typeInto } from '../../test/render'
import { ToastProvider } from '../../ui'
import { RacePage } from './RacePage'

vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ login: vi.fn() }) }))

const renderPage = async () => {
  const container = await render(
    <ToastProvider>
      <RacePage />
    </ToastProvider>,
  )
  await flush()
  return container
}
const form = (c: HTMLElement) => c.querySelector('form')!

/** A race request that stays open until resolved or aborted. */
function pendingRace() {
  let resolve!: (r: RaceReport) => void
  let signal: AbortSignal | undefined
  const spy = vi.spyOn(api.admin, 'race').mockImplementation((_body, s) => {
    signal = s
    return new Promise<RaceReport>((res, reject) => {
      resolve = res
      s?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })
  })
  return { spy, resolve: (r: RaceReport) => resolve(r), signal: () => signal }
}

describe('RacePage', () => {
  beforeEach(() => localStorage.clear())

  it('shows the last saved race on load', async () => {
    vi.spyOn(api.admin, 'latestRace').mockResolvedValue(raceReport())
    const c = await renderPage()

    expect(c.textContent).toContain('Last saved race')
    expect(c.textContent).toContain('Median latency')
    expect(c.textContent).toContain('By question type')
    expect(c.textContent).toContain('q-err-4012')
    // judge score and reason in the per-question detail
    expect(c.textContent).toContain('Misses the retry count')
    expect(c.textContent).toContain('2/5')
  })

  it('shows an empty state before the first race', async () => {
    vi.spyOn(api.admin, 'latestRace').mockResolvedValue(undefined)
    const c = await renderPage()
    expect(c.textContent).toContain('No race yet')
  })

  it('says "admin only" when the backend answers 403', async () => {
    vi.spyOn(api.admin, 'latestRace').mockRejectedValue(new ApiError(403, { status: 403, title: 'Forbidden' }))
    const c = await renderPage()
    expect(c.textContent).toContain('Admin only')
  })

  it('runs a race with the form values and blocks a second submit while running', async () => {
    vi.spyOn(api.admin, 'latestRace').mockResolvedValue(undefined)
    const race = pendingRace()
    const c = await renderPage()

    const [repetitions, limit] = c.querySelectorAll('input')
    await typeInto(repetitions, '2')
    await typeInto(limit, '4')
    await submit(form(c))

    expect(race.spy).toHaveBeenCalledWith({ repetitions: 2, limitQuestions: 4, useJudge: true, seedCorpus: false }, expect.any(AbortSignal))
    expect(getButton(c, 'Racing…').disabled).toBe(true)
    expect(c.textContent).toContain('Race running')
    expect(c.textContent).toContain('4 questions × 2 repetitions')

    await submit(form(c))
    expect(race.spy).toHaveBeenCalledTimes(1)

    race.resolve(raceReport())
    await flush()
    expect(c.textContent).toContain('This run')
    expect(getButton(c, 'Run race').disabled).toBe(false)
  })

  it('cancels a running race and explains the server keeps going', async () => {
    vi.spyOn(api.admin, 'latestRace').mockResolvedValue(undefined)
    const race = pendingRace()
    const c = await renderPage()

    await submit(form(c))
    await click(getButton(c, 'Cancel'))
    await flush()

    expect(race.signal()?.aborted).toBe(true)
    expect(c.textContent).toContain('Stopped waiting')
    expect(c.textContent).toContain('The server keeps running the race')
    expect(getButton(c, 'Run race').disabled).toBe(false)
  })

  it('stops waiting after the chosen timeout', async () => {
    // only timeouts: the elapsed-time clock (setInterval) keeps real time
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      vi.spyOn(api.admin, 'latestRace').mockResolvedValue(undefined)
      const race = pendingRace()
      const c = await renderPage()

      await submit(form(c))
      await act(() => vi.advanceTimersByTimeAsync(60 * 60_000 - 1))
      expect(race.signal()?.aborted).toBe(false)
      await act(() => vi.advanceTimersByTimeAsync(1))
      await flush()

      expect(race.signal()?.aborted).toBe(true)
      expect(c.textContent).toContain('Stopped waiting after 60 minutes')
    } finally {
      vi.useRealTimers()
    }
  })

  it('validates repetitions before running', async () => {
    vi.spyOn(api.admin, 'latestRace').mockResolvedValue(undefined)
    const race = vi.spyOn(api.admin, 'race')
    const c = await renderPage()

    await typeInto(c.querySelectorAll('input')[0], '0')
    expect(c.textContent).toContain('A whole number from 1 to 10')
    expect(getButton(c, 'Run race').disabled).toBe(true)
    await submit(form(c))
    expect(race).not.toHaveBeenCalled()
  })

  it('shows a re-authenticate prompt when the run gets 401', async () => {
    vi.spyOn(api.admin, 'latestRace').mockResolvedValue(undefined)
    vi.spyOn(api.admin, 'race').mockRejectedValue(new ApiError(401, { status: 401, title: 'Unauthorized' }))
    const c = await renderPage()

    await submit(form(c))
    await flush()
    expect(c.textContent).toContain('Your session has expired')
    expect(getButton(c, 'Sign in again')).toBeTruthy()
  })
})
