import { forwardRef } from 'react'
import type { ReactElement, ReactNode, Ref } from 'react'
import { SLOT_NAME, applySlot } from '@praxis-kit/react/shared'
import { cloneSlotChild } from './cloneSlotChild'

type SlotProps = { [key: string]: unknown }

// React 18: ref must be extracted via forwardRef; it is not available as a plain prop.
export const Slot = forwardRef(function Slot(
  { children, ...slotProps }: SlotProps,
  ref: Ref<unknown>,
): ReactElement {
  return applySlot(children as ReactNode, slotProps, ref, cloneSlotChild)
})

Slot.displayName = SLOT_NAME
