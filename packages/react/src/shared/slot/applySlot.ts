import { isValidElement } from 'react'
import type { ReactElement, ReactNode, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'

import { invariant } from './invariant'
import { extractSlottable } from './extractSlottable'
import type { CloneSlotChildFn } from './types'

export function applySlot(
  children: ReactNode,
  slotProps: AnyRecord,
  ref: Ref<unknown> | null,
  cloneSlotChild: CloneSlotChildFn,
): ReactElement {
  const extraction = extractSlottable(children)

  if (extraction) {
    const merged = cloneSlotChild({ child: extraction.child, slotProps, ref })
    return extraction.rebuild(merged)
  }

  invariant(isValidElement(children), 'Slot: child must be a valid React element')
  return cloneSlotChild({ child: children, slotProps, ref })
}
