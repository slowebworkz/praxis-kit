import type { ReactElement, Ref } from 'react'
import { mergeRefs } from '../../shared/merge-refs'

// React 19: ref is a plain prop accessible via element.props.ref
export function getChildRef(element: ReactElement): Ref<unknown> | null {
  const props = element.props as { ref?: unknown }
  return (props.ref as Ref<unknown> | null | undefined) ?? null
}

export { mergeRefs as composeRefs }
