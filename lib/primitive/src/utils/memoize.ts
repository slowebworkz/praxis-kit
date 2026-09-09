import type { UnaryFn } from '../types/function-types'

/**
 * Caches the result of a pure, single-argument function in an unbounded `Map`.
 *
 * Best suited to functions that are expensive relative to a cache lookup and
 * repeatedly called with a relatively small, bounded set of inputs (for
 * example, a finite vocabulary of tokens or strings). Avoid memoizing
 * unbounded or attacker-controlled input spaces, as the cache will grow
 * without limit. Use `LRUCache` instead when cache size should remain bounded.
 */
export function memoize<T, R>(fn: UnaryFn<T, R>): UnaryFn<T, R> {
  const cache = new Map<T, R>()

  return (arg: T): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!
    }

    const result = fn(arg)
    cache.set(arg, result)
    return result
  }
}
