import { isValidElement } from 'preact'
import type { Ref } from 'preact'
import type { AnyVNode, UnknownProps } from '../types'
import { invariant } from './invariant'
import { extractSlottable } from './extractSlottable'
import type { CloneSlotChildFn } from './types'

export function applySlot(
  children: unknown,
  slotProps: UnknownProps,
  ref: Ref<unknown> | null,
  cloneSlotChild: CloneSlotChildFn,
): AnyVNode {
  const extraction = extractSlottable(children)

  if (extraction) {
    const merged = cloneSlotChild({ child: extraction.child, slotProps, ref })
    return extraction.rebuild(merged)
  }

  invariant(isValidElement(children), 'Slot: child must be a valid Preact element')
  return cloneSlotChild({ child: children as AnyVNode, slotProps, ref })
}
