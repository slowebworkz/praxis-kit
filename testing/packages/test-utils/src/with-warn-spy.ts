import { vi } from 'vitest'
import type { MockInstance } from 'vitest'

/**
 * Runs `run` with `console.warn` silenced and always restores it, even if an assertion throws.
 * Synchronous when `run` is, so a caller that does not await still sees the spy restored; when
 * `run` returns a promise, the spy is restored once it settles and that promise is returned.
 */
export function withWarnSpy<R extends void | Promise<void>>(
  run: (warn: MockInstance<typeof console.warn>) => R,
): R {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  let result: R
  try {
    result = run(warn)
  } catch (error) {
    warn.mockRestore()
    throw error
  }
  if (result instanceof Promise) return result.finally(() => warn.mockRestore()) as R
  warn.mockRestore()
  return result
}
