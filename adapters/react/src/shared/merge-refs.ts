import type { Ref } from 'react'

export function mergeRefs<T>(...refs: (Ref<T> | null | undefined)[]): Ref<T> | null {
  const active = refs.filter((r): r is NonNullable<typeof r> => r != null)
  if (active.length === 0) return null
  if (active.length === 1) return active[0]!
  return (value: T | null) => {
    for (const ref of active) {
      if (typeof ref === 'function') {
        ref(value)
      } else {
        ref.current = value
      }
    }
  }
}
