import type { AnyRecord } from '@praxis-kit/primitive'
import { iterate, EVENT_HANDLER_RE } from '@praxis-kit/primitive'
import { isFunction } from '@praxis-kit/guards'
import type { PropMergePolicy } from './policies'
import { policyHandlers } from './policies'

export function mergeSlotProps(slotProps: AnyRecord, childProps: AnyRecord): AnyRecord {
  const merged: AnyRecord = { ...slotProps }
  // `forEachKey` already iterates only `childProps`'s own keys (see its `keys()`/`entries()`
  // implementation in `@praxis-kit/foundation`) — no separate `Object.hasOwn` guard needed here.
  iterate.forEachKey(childProps, (key) => {
    merged[key] = applyMergePolicy(key, slotProps[key], childProps[key])
  })
  return merged
}

// React/Preact's `className` and Vue/Solid/Svelte's `class` are the same concept under different
// adapter-specific naming — both get the same concat policy, not just the literal key `className`.
function classifyProp(key: string, slotVal: unknown, childVal: unknown): PropMergePolicy {
  if (EVENT_HANDLER_RE.test(key) && isFunction(slotVal) && isFunction(childVal)) return 'chain'
  switch (key) {
    case 'className':
    case 'class':
      return 'concat'
    case 'style':
      return 'shallow-merge'
    default:
      return 'child-wins'
  }
}

function applyMergePolicy(key: string, slotVal: unknown, childVal: unknown): unknown {
  return policyHandlers[classifyProp(key, slotVal, childVal)](slotVal, childVal)
}
