import type { Ref } from 'preact'
import type { AnyVNode } from '../types/primitives'

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

// Preact 10 stores ref directly on the VNode, not in props.
export function getChildRef(child: AnyVNode): Ref<unknown> | null {
  const ref = child.ref
  return (ref as Ref<unknown> | null | undefined) ?? null
}
