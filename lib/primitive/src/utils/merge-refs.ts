import { iterate } from './iterate'
import { isFunction } from '../guards/foundational'

import type { AnyRef } from '../types'

// Returns null for zero refs, the original ref unchanged for exactly one
// (no wrapper allocated), and a new callback ref only when merging 2+.
export function mergeRefsCore<T>(...refs: (AnyRef<T> | null | undefined)[]): AnyRef<T> | null {
  const resolvedRefs = refs.filter((r): r is NonNullable<typeof r> => r != null)
  if (resolvedRefs.length === 0) return null
  if (resolvedRefs.length === 1) return resolvedRefs[0] ?? null
  return (value: T | null) => {
    iterate.forEach(resolvedRefs, (ref) => {
      if (isFunction(ref)) {
        ref(value)
      } else {
        ref.current = value
      }
    })
  }
}
