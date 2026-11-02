import { api } from '../../api/client'
import type { A2aTask, A2aTaskState } from '../../api/types'
import { deadline, sleep } from '../../lib/abort'

export const isTerminal = (state: A2aTaskState) => state === 'completed' || state === 'failed'

/** Thrown when a task is still not completed or failed when the time limit runs out. */
export class TaskTimeoutError extends Error {
  constructor(readonly lastSeen: A2aTask | null) {
    super(lastSeen ? `Task ${lastSeen.id} was still ${lastSeen.state} when the time limit ran out` : 'The agent did not answer within the time limit')
  }
}

export interface RunTaskOptions {
  signal?: AbortSignal
  /** every state seen, starting with the POST response */
  onUpdate?: (task: A2aTask) => void
  pollMs?: number
  timeoutMs?: number
}

/**
 * Submits a task (POST /api/a2a/tasks), then polls tasks/get until it is completed or failed.
 * The current backend runs the task before answering the POST, so polling usually ends at once;
 * it is kept so an asynchronous backend works unchanged.
 */
export async function runA2aTask(input: string, { signal, onUpdate, pollMs = 1000, timeoutMs = 180_000 }: RunTaskOptions = {}): Promise<A2aTask> {
  const limit = deadline(timeoutMs, signal)
  let task: A2aTask | null = null
  try {
    task = await api.a2a.createTask(input, limit.signal)
    onUpdate?.(task)
    while (!isTerminal(task.state)) {
      await sleep(pollMs, limit.signal)
      task = await api.a2a.getTask(task.id, limit.signal)
      onUpdate?.(task)
    }
    return task
  } catch (e) {
    if (limit.timedOut()) throw new TaskTimeoutError(task)
    throw e
  } finally {
    limit.dispose()
  }
}
