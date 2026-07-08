import { Fragment } from 'react'
import type { ReactElement } from 'react'
import type { CloneInput, GetChildRef, UnknownProps } from '../types'
import { cloneWithProps } from './clone'
import { composeRefs } from './compose-refs'
import { mergeProps } from './mergeProps'

/**
 * Pure helper that merges slot props into a child element and returns the clone.
 * Fragment children receive merged props but no ref — Fragments cannot hold refs.
 *
 * `getChildRef` is the one piece that differs between React 18 (`legacy`) and 19
 * (`current`) — where each version actually stores an element's `ref` — so it's
 * injected rather than imported directly.
 */
export function makeCloneSlotChild(getChildRef: GetChildRef) {
  return function cloneSlotChild({ child, slotProps, ref }: CloneInput): ReactElement {
    const childProps = child.props as UnknownProps
    const isFragment = child.type === Fragment
    const childRef = isFragment ? null : getChildRef(child)
    const mergedRef = isFragment ? null : composeRefs(ref, childRef)
    const merged = mergeProps(slotProps, childProps)
    return cloneWithProps(child, merged, mergedRef)
  }
}
