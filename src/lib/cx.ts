/** Joins class names, skipping falsy entries: cx('btn', active && 'is-active'). */
export function cx(...parts: unknown[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')
}
