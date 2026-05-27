import type { AnyRecord } from '../types'
import { isEventKey, isFunction } from './predicates'
import { policyHandlers } from './policies'
import type { PropMergePolicy } from './policies'

export function mergeSlotProps(slotProps: AnyRecord, childProps: AnyRecord): AnyRecord {
  const merged: AnyRecord = { ...slotProps }
  for (const key in childProps) {
    if (!Object.hasOwn(childProps, key)) continue
    merged[key] = applyMergePolicy(key, slotProps[key], childProps[key])
  }
  return merged
}

function classifyProp(key: string, slotVal: unknown, childVal: unknown): PropMergePolicy {
  if (isEventKey(key) && isFunction(slotVal) && isFunction(childVal)) return 'chain'
  if (key === 'className') return 'concat'
  if (key === 'style') return 'shallow-merge'
  return 'child-wins'
}

function applyMergePolicy(key: string, slotVal: unknown, childVal: unknown): unknown {
  return policyHandlers[classifyProp(key, slotVal, childVal)](slotVal, childVal)
}
