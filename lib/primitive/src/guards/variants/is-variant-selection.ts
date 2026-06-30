import type { AnyRecord } from '../../types'
import { isObject, isString } from '../foundational'

export function isVariantSelection(value: unknown): value is AnyRecord {
  if (!isObject(value)) return false
  return Object.keys(value).every(isString)
}
