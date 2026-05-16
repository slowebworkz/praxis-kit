import { cloneElement } from 'react'
import type { ReactElement, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'

export function cloneWithProps(
  child: ReactElement,
  props: AnyRecord,
  ref: Ref<unknown> | null,
): ReactElement {
  return cloneElement(child, ref !== null ? { ...props, ref } : props)
}
