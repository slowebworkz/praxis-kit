import { isValidElement } from 'react'
import { jsx } from 'react/jsx-runtime'
import type { ComponentType, ReactElement, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'

// @radix-ui/react-slot handles className merging, event handler chaining, and ref
// composition internally — no manual mergeRefs or child-ref extraction needed.
export function composeSlot(
  slotComponent: ComponentType<AnyRecord>,
  child: unknown,
  props: AnyRecord,
  ref: Ref<unknown> | null,
): ReactElement {
  if (!isValidElement(child)) {
    throw new Error('asChild requires exactly one valid React element child')
  }
  return jsx(slotComponent, { ...props, ref, children: child }) as ReactElement
}
