import { cloneElement } from 'react'
import type { ReactElement, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'

export function clone(
  child: ReactElement,
  props: AnyRecord,
  ref: Ref<unknown> | null,
): ReactElement {
  return cloneElement(child, { ...props, ...(ref !== null && { ref }) })
}
