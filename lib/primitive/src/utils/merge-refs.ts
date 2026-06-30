import { iterate } from './iterate'

interface RefObject<T> {
  current: T | null
}

type RefCallback<T> = (value: T | null) => void
type AnyRef<T> = RefObject<T> | RefCallback<T>

export function mergeRefsCore<T>(...refs: (AnyRef<T> | null | undefined)[]): AnyRef<T> | null {
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
