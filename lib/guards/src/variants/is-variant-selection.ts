import type { AnyRecord } from '@praxis-kit/primitive'
import { isObject, isString } from '../foundational'

export function isVariantSelection(value: unknown): value is AnyRecord {
  if (!isObject(value)) return false
  // Not a bare `.every(isString)` — guardz guards accept an optional second `config` param,
  // which collides with Array#every passing the current index as its second callback argument.
  return Object.keys(value).every((key) => isString(key))
}
