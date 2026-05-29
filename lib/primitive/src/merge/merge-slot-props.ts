import type { AnyRecord } from '../types'
import { isEventKey, isFunction } from './predicates'
import { policyHandlers } from './policies'
import type { PropMergePolicy } from './policies'

// Named props whose merge policy is determined by key alone (no value inspection needed).
const NAMED_PROP_POLICIES = new Map<string, PropMergePolicy>([
  ['className', 'concat'],
  ['style', 'shallow-merge'],
])

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
  return NAMED_PROP_POLICIES.get(key) ?? 'child-wins'
}

function applyMergePolicy(key: string, slotVal: unknown, childVal: unknown): unknown {
  return policyHandlers[classifyProp(key, slotVal, childVal)](slotVal, childVal)
}
