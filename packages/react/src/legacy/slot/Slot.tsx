import { forwardRef, isValidElement } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'
import type { ReactElement, Ref } from 'react'
import { SLOT_NAME } from '../../shared/slot/constants'
import { invariant } from '../../shared/slot/invariant'
import { SlotClone } from './SlotClone'

// React 18: ref must be extracted via forwardRef; it is not available as a plain prop.
export const Slot = forwardRef(function Slot(
  { children, ...slotProps }: AnyRecord,
  ref: Ref<unknown>,
): ReactElement {
  invariant(isValidElement(children), 'Slot: child must be a valid React element')
  return SlotClone({ child: children, slotProps, ref })
})

Slot.displayName = SLOT_NAME
