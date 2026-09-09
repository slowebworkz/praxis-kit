import { cloneElement, Fragment } from 'preact'
import type { Ref } from 'preact'
import type { AnyVNode, UnknownProps } from '../types'
import { mergeProps } from './mergeProps'
import { getChildRef, mergeRefs } from './composeRefs'

type CloneInput = {
  child: AnyVNode
  slotProps: UnknownProps
  ref: Ref<unknown> | null
}

export function cloneSlotChild({ child, slotProps, ref }: CloneInput): AnyVNode {
  const childProps = child.props as UnknownProps
  const isFragment = child.type === Fragment
  const childRef = isFragment ? null : getChildRef(child)
  const mergedRef = isFragment ? null : mergeRefs(ref, childRef)
  const merged = mergeProps(slotProps, childProps)
  return cloneElement(child, mergedRef !== null ? { ...merged, ref: mergedRef } : merged)
}
