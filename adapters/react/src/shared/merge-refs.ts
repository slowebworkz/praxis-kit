import type { Ref } from 'react'
import { mergeRefsCore } from '@praxis-kit/primitive'

export function mergeRefs<T>(...refs: (Ref<T> | null | undefined)[]): Ref<T> | null {
  return mergeRefsCore(...refs) as Ref<T> | null
}
