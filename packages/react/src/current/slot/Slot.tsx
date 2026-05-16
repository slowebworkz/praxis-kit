/**
 * Public Slot component for React 19.
 * Receives `ref` as a plain prop (React 19 semantics) and forwards it to the child
 * via `cloneSlotChild`, which composes it with any existing ref already on the child.
 */
import { isValidElement } from 'react'
import type { ReactElement, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'
import type { Merge } from 'type-fest'
import { SLOT_NAME, invariant } from '@/shared'
import { cloneSlotChild } from './cloneSlotChild'

type SlotProps = Merge<
  AnyRecord,
  {
    children?: unknown
    ref?: Ref<unknown> | null
  }
>

// React 19: ref is received as a plain prop on function components.
export function Slot({ ref = null, children, ...slotProps }: SlotProps): ReactElement {
  invariant(isValidElement(children), 'Slot: child must be a valid React element')
  return cloneSlotChild({ child: children, slotProps, ref })
}

Slot.displayName = SLOT_NAME
