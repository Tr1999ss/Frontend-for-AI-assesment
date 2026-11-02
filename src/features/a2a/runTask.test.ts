import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { a2aTask } from '../../test/fixtures'
import { runA2aTask, TaskTimeoutError } from './runTask'
import { timelineSteps } from './TaskTimeline'

describe('runA2aTask', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('stops at once when the POST already returns a terminal state', async () => {
    vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask())
    const getTask = vi.spyOn(api.a2a, 'getTask')

    const task = await runA2aTask('q')

    expect(task.state).toBe('completed')
    expect(getTask).not.toHaveBeenCalled()
  })

  it('polls tasks/get until the task completes, reporting every state', async () => {
    vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask({ state: 'submitted', output: undefined }))
    const getTask = vi
      .spyOn(api.a2a, 'getTask')
      .mockResolvedValueOnce(a2aTask({ state: 'working', output: undefined }))
      .mockResolvedValueOnce(a2aTask({ state: 'completed' }))
    const seen: string[] = []

    const done = runA2aTask('q', { pollMs: 500, onUpdate: (t) => seen.push(t.state) })
    await vi.advanceTimersByTimeAsync(1000)

    expect((await done).state).toBe('completed')
    expect(seen).toEqual(['submitted', 'working', 'completed'])
    expect(getTask).toHaveBeenCalledWith('task-1', expect.any(AbortSignal))
  })

  it('ends on failed as well as completed', async () => {
    vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask({ state: 'working', output: undefined }))
    vi.spyOn(api.a2a, 'getTask').mockResolvedValue(a2aTask({ state: 'failed', output: undefined, error: 'model unavailable' }))

    const done = runA2aTask('q', { pollMs: 100 })
    await vi.advanceTimersByTimeAsync(100)

    expect(await done).toMatchObject({ state: 'failed', error: 'model unavailable' })
  })

  it('gives up with TaskTimeoutError when the task never finishes', async () => {
    vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask({ state: 'working', output: undefined }))
    vi.spyOn(api.a2a, 'getTask').mockResolvedValue(a2aTask({ state: 'working', output: undefined }))

    const done = runA2aTask('q', { pollMs: 100, timeoutMs: 1000 })
    const assertion = expect(done).rejects.toBeInstanceOf(TaskTimeoutError)
    await vi.advanceTimersByTimeAsync(1100)
    await assertion
  })

  it('stops polling when the caller aborts', async () => {
    vi.spyOn(api.a2a, 'createTask').mockResolvedValue(a2aTask({ state: 'working', output: undefined }))
    const getTask = vi.spyOn(api.a2a, 'getTask').mockResolvedValue(a2aTask({ state: 'working', output: undefined }))
    const controller = new AbortController()

    const done = runA2aTask('q', { pollMs: 100, signal: controller.signal })
    const assertion = expect(done).rejects.toBeDefined()
    await vi.advanceTimersByTimeAsync(250)
    controller.abort()
    await assertion
    const calls = getTask.mock.calls.length
    await vi.advanceTimersByTimeAsync(1000)
    expect(getTask.mock.calls.length).toBe(calls)
  })
})

describe('timelineSteps', () => {
  const statuses = (task: Parameters<typeof timelineSteps>[0]) => timelineSteps(task).map((s) => `${s.label}:${s.status}`)

  it('shows the request in flight before the server answers', () => {
    expect(statuses(null)).toEqual(['Submitted:current', 'Working:upcoming', 'Completed:upcoming'])
  })

  it('follows submitted → working → completed | failed', () => {
    expect(statuses(a2aTask({ state: 'submitted' }))).toEqual(['Submitted:current', 'Working:upcoming', 'Completed:upcoming'])
    expect(statuses(a2aTask({ state: 'working' }))).toEqual(['Submitted:done', 'Working:current', 'Completed:upcoming'])
    expect(statuses(a2aTask({ state: 'completed' }))).toEqual(['Submitted:done', 'Working:done', 'Completed:done'])
    expect(statuses(a2aTask({ state: 'failed' }))).toEqual(['Submitted:done', 'Working:done', 'Failed:failed'])
  })
})
