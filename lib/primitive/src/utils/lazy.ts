import type { Factory } from '../types'

/**
 * Lazily initializes a value. The factory is invoked exactly once on the first
 * call, and every subsequent call returns the cached result, even if the
 * result is `undefined`, `null`, `false`, `0`, or `''`.
 */
export function lazy<T>(factory: Factory<T>): Factory<T> {
  let initialized = false
  let value!: T

  return () => {
    if (!initialized) {
      value = factory()
      initialized = true
    }

    return value
  }
}
