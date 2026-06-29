import type { AnyRecord } from '@pk2/foundation'
import { iterate } from '@praxis-kit/primitive'
import { EVENT_HANDLER_RE, isFunction } from '@praxis-kit/shared'
import type { PropMergePolicy } from './policies'
import { policyHandlers } from './policies'

type UnknownProps = AnyRecord

export function mergeSlotProps(slotProps: UnknownProps, childProps: UnknownProps): UnknownProps {
  const merged: UnknownProps = { ...slotProps }
  iterate.forEachKey(childProps, (key) => {
    if (!Object.hasOwn(childProps, key)) return
    merged[key] = applyMergePolicy(key, slotProps[key], childProps[key])
  })
  return merged
}

function classifyProp(key: string, slotVal: unknown, childVal: unknown): PropMergePolicy {
  if (EVENT_HANDLER_RE.test(key) && isFunction(slotVal) && isFunction(childVal)) return 'chain'
  if (key === 'className') return 'concat'
  if (key === 'style') return 'shallow-merge'
  return 'child-wins'
}

function applyMergePolicy(key: string, slotVal: unknown, childVal: unknown): unknown {
  return policyHandlers[classifyProp(key, slotVal, childVal)](slotVal, childVal)
}
