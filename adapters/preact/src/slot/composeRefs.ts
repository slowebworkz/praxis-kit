import type { Ref } from 'preact'
import type { AnyVNode } from '../types'
import { mergeRefsCore } from '@praxis-kit/primitive'

export function mergeRefs<T>(...refs: (Ref<T> | null | undefined)[]): Ref<T> | null {
  return mergeRefsCore(...refs) as Ref<T> | null
}

// Preact 10 stores ref directly on the VNode, not in props.
export function getChildRef(child: AnyVNode): Ref<unknown> | null {
  const ref = child.ref
  return (ref as Ref<unknown> | null | undefined) ?? null
}
