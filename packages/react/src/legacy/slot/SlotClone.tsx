import type { ReactElement, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'
import { mergeProps } from '../../shared/slot/mergeProps'
import { getChildRef, composeRefs } from './composeRefs'
import { clone } from './clone'

type SlotCloneInput = {
  child: ReactElement
  slotProps: AnyRecord
  ref: Ref<unknown> | null
}

export function SlotClone({ child, slotProps, ref }: SlotCloneInput): ReactElement {
  const childProps = child.props as AnyRecord
  const childRef = getChildRef(child)
  const mergedRef = composeRefs(ref, childRef)
  const merged = mergeProps(slotProps, childProps)
  return clone(child, merged, mergedRef)
}
