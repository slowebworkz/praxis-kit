import { forwardRef } from 'preact/compat'
import type { ForwardedRef } from 'preact/compat'
import type { AnyVNode } from '../types/primitives'
import { SLOT_NAME } from './constants'
import { applySlot } from './applySlot'
import { cloneSlotChild } from './cloneSlotChild'

type SlotProps = { [key: string]: unknown }

// forwardRef ensures the ref passed to Slot is forwarded to the actual child element
// rather than captured on the Slot component instance.
export const Slot = forwardRef(function Slot(
  { children, ...slotProps }: SlotProps,
  ref: ForwardedRef<unknown>,
): AnyVNode {
  return applySlot(children, slotProps, ref ?? null, cloneSlotChild)
})

Object.assign(Slot, { displayName: SLOT_NAME })
