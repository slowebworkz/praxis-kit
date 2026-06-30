import type { AnyRecord } from '../../types'
import { isObject } from '../foundational/is-object'
import { isString } from '../foundational/is-string'

export function isVariantSelection(value: unknown): value is AnyRecord {
  if (!isObject(value)) return false
  return Object.keys(value).every(isString)
}
