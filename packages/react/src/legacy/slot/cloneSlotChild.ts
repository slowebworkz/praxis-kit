import { Fragment } from 'react'
import type { ReactElement, Ref } from 'react'
import type { AnyRecord } from '@polymorphic-ui/core'
import { mergeProps } from '@/shared'
import { getChildRef, composeRefs } from './composeRefs'
import { cloneWithProps } from '@/shared'

type CloneInput = {
  child: ReactElement
  slotProps: AnyRecord
  ref: Ref<unknown> | null
}

export function cloneSlotChild({ child, slotProps, ref }: CloneInput): ReactElement {
  const childProps = child.props as AnyRecord
  const isFragment = child.type === Fragment
  const childRef = isFragment ? null : getChildRef(child)
  const mergedRef = isFragment ? null : composeRefs(ref, childRef)
  const merged = mergeProps(slotProps, childProps)
  return cloneWithProps(child, merged, mergedRef)
}
