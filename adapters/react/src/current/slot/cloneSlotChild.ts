/**
 * Pure helper that merges slot props into a child element and returns the clone.
 * Fragment children receive merged props but no ref — Fragments cannot hold refs.
 */
import { Fragment } from 'react'
import type { ReactElement, Ref } from 'react'
import type { UnknownProps } from '@praxis-kit/react/shared'
import { mergeProps } from '@praxis-kit/react/shared'
import { getChildRef, composeRefs } from './composeRefs'
import { cloneWithProps } from '@praxis-kit/react/shared'

type CloneInput = {
  child: ReactElement
  slotProps: UnknownProps
  ref: Ref<unknown> | null
}

export function cloneSlotChild({ child, slotProps, ref }: CloneInput): ReactElement {
  const childProps = child.props as UnknownProps
  const isFragment = child.type === Fragment
  const childRef = isFragment ? null : getChildRef(child)
  const mergedRef = isFragment ? null : composeRefs(ref, childRef)
  const merged = mergeProps(slotProps, childProps)
  return cloneWithProps(child, merged, mergedRef)
}
