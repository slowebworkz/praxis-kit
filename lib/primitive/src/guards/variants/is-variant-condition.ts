import type { VariantConditionValue } from '../../types'
import { isArray } from '../foundational/is-array'
import { isBoolean } from '../foundational/is-boolean'
import { isString } from '../foundational'

export function isVariantCondition(value: unknown): value is VariantConditionValue {
  if (isString(value) || isBoolean(value)) return true
  if (!isArray(value)) return false
  return value.every((v) => isString(v) || isBoolean(v))
}
