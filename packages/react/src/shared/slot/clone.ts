import { cloneElement } from 'react'
import type { ReactElement, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'

/**
 * Clones `child` with merged props and an optional composed ref.
 * Omits `ref` from the clone entirely when null — passing null would silently
 * clear any existing ref already attached to the element.
 */
export function cloneWithProps(
  child: ReactElement,
  props: AnyRecord,
  ref: Ref<unknown> | null,
): ReactElement {
  return cloneElement(child, ref !== null ? { ...props, ref } : props)
}
