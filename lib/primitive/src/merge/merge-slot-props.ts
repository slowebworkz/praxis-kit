import type { AnyRecord } from '../types'
import { iterate } from '../utils'
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
  iterate.forEachEntry(childProps, (key, childVal) => {
    merged[key] = applyMergePolicy(key, slotProps[key], childVal)
  })
  return merged
}

function classifyProp(key: string, slotVal: unknown, childVal: unknown): PropMergePolicy {
  if (isEventKey(key) && isFunction(slotVal) && isFunction(childVal)) return 'chain'
  return NAMED_PROP_POLICIES.get(key) ?? 'child-wins'
}

function applyMergePolicy(key: string, slotVal: unknown, childVal: unknown): unknown {
  return policyHandlers[classifyProp(key, slotVal, childVal)](slotVal, childVal)
}
