import type { Ref } from 'react'
import { iterate } from '@praxis-kit/primitive'

export function mergeRefs<T>(...refs: (Ref<T> | null | undefined)[]): Ref<T> | null {
  const active = refs.filter((r): r is NonNullable<typeof r> => r != null)
  if (active.length === 0) return null
  if (active.length === 1) return active[0]!
  return (value: T | null) => {
    iterate.forEach(active, (ref) => {
      if (typeof ref === 'function') {
        ref(value)
      } else {
        ref.current = value
      }
    })
  }
}
