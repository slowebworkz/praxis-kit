/**
 * Merges slot props with child props using per-key policies.
 *
 * Iteration is handled here; classification and per-policy logic live in
 * `policies.ts` so each layer has a single responsibility.
 */
import type { AnyRecord } from '@polymorphic-ui/core'
import { isReactEventKey, isFunction } from './predicates'
import { policyHandlers } from './policies'
import type { PropMergePolicy } from './policies'

export function mergeProps(slotProps: AnyRecord, childProps: AnyRecord): AnyRecord {
  const merged: AnyRecord = { ...slotProps }
  for (const [key, childVal] of Object.entries(childProps)) {
    merged[key] = applyMergePolicy(key, slotProps[key], childVal)
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
