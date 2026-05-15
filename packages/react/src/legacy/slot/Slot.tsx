/**
 * Public Slot component for React 18.
 * Wraps in `forwardRef` since ref is not available as a plain prop in React 18.
 * Forwards the extracted ref to the child via `cloneSlotChild`, which composes it
 * with any existing ref already on the child.
 */
import { forwardRef, isValidElement } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'
import type { ReactElement, Ref } from 'react'
import type { Merge } from 'type-fest'
import { SLOT_NAME } from '@/shared/slot/constants'
import { invariant } from '@/shared/slot/invariant'
import { cloneSlotChild } from './cloneSlotChild'

type SlotProps = Merge<
  AnyRecord,
  {
    children?: unknown
  }
>

// React 18: ref must be extracted via forwardRef; it is not available as a plain prop.
export const Slot = forwardRef(function Slot(
  { children, ...slotProps }: SlotProps,
  ref: Ref<unknown>,
): ReactElement {
  invariant(isValidElement(children), 'Slot: child must be a valid React element')
  return cloneSlotChild({ child: children, slotProps, ref })
})

Slot.displayName = SLOT_NAME
