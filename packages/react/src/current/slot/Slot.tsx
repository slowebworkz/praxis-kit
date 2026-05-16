import type { ReactElement, ReactNode, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'
import type { Merge } from 'type-fest'
import { SLOT_NAME, applySlot } from '@/shared'
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
  return applySlot(children as ReactNode, slotProps, ref, cloneSlotChild)
}

Slot.displayName = SLOT_NAME
