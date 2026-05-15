import type { ReactElement, Ref } from 'react'
import { mergeRefs } from '../../shared/merge-refs'

// React 18: ref is a separate property on the element object, not in props.
export function getChildRef(element: ReactElement): Ref<unknown> | null {
  const el = element as { ref?: unknown }
  return (el.ref as Ref<unknown> | null | undefined) ?? null
}

export { mergeRefs as composeRefs }
