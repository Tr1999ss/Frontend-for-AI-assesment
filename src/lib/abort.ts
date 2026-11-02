/**
 * An AbortSignal that fires when `parent` aborts or after `ms`, whichever comes first.
 * `timedOut()` tells the two apart; call `dispose()` when the work is done.
 */
export function deadline(ms: number, parent?: AbortSignal) {
  const controller = new AbortController()
  let expired = false
  const timer = setTimeout(() => {
    expired = true
    controller.abort()
  }, ms)
  const onParentAbort = () => controller.abort()
  if (parent?.aborted) controller.abort()
  else parent?.addEventListener('abort', onParentAbort, { once: true })
  return {
    signal: controller.signal,
    timedOut: () => expired,
    dispose() {
      clearTimeout(timer)
      parent?.removeEventListener('abort', onParentAbort)
    },
  }
}

/** Resolves after `ms`; rejects as soon as `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}
