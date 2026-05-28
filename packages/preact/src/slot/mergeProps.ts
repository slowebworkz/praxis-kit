import type { UnknownProps } from '../types'
import { isReactEventKey, isFunction } from './predicates'
import { policyHandlers } from './policies'
import type { PropMergePolicy } from './policies'

export function mergeProps(slotProps: UnknownProps, childProps: UnknownProps): UnknownProps {
  const merged: UnknownProps = { ...slotProps }
  for (const key in childProps) {
    if (!Object.hasOwn(childProps, key)) continue
    merged[key] = applyMergePolicy(key, slotProps[key], childProps[key])
  }
  return merged
}

function classifyProp(key: string, slotVal: unknown, childVal: unknown): PropMergePolicy {
  if (isReactEventKey(key) && isFunction(slotVal) && isFunction(childVal)) return 'chain'
  if (key === 'className') return 'concat'
  if (key === 'style') return 'shallow-merge'
  return 'child-wins'
}

function applyMergePolicy(key: string, slotVal: unknown, childVal: unknown): unknown {
  return policyHandlers[classifyProp(key, slotVal, childVal)](slotVal, childVal)
}
