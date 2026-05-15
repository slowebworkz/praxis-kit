import type { AnyRecord } from '@polymorphic-ui/core'
import { isEventKey, isFunction, isPlainObject } from './predicates'
import { chainHandlers, mergeClassNames, mergeStyles } from './policies'

export function mergeProps(slotProps: AnyRecord, childProps: AnyRecord): AnyRecord {
  const merged: AnyRecord = { ...slotProps }
  for (const [key, childVal] of Object.entries(childProps)) {
    const slotVal = slotProps[key]
    if (isEventKey(key) && isFunction(slotVal) && isFunction(childVal)) {
      merged[key] = chainHandlers(childVal, slotVal)
    } else if (key === 'className') {
      merged[key] = mergeClassNames(slotVal, childVal)
    } else if (key === 'style' && isPlainObject(slotVal)) {
      merged[key] = mergeStyles(slotVal, childVal)
    } else {
      merged[key] = childVal
    }
  }
  return merged
}
