import type { ReactElement, ReactNode, Ref } from 'react'
import { SLOT_NAME, applySlot } from '@praxis-kit/react/shared'
import { cloneSlotChild } from './cloneSlotChild'

type SlotProps = { ref?: Ref<unknown> | null; [key: string]: unknown }

// React 19: ref is received as a plain prop on function components.
export function Slot({ ref = null, children, ...slotProps }: SlotProps): ReactElement {
  return applySlot(children as ReactNode, slotProps, ref, cloneSlotChild)
}

Slot.displayName = SLOT_NAME
