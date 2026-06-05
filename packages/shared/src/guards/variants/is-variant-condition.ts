import type { VariantConditionValue } from '../../types'
import { isArray, isBoolean, isString } from '../foundational'

export function isVariantCondition(value: unknown): value is VariantConditionValue {
  if (isString(value) || isBoolean(value)) return true
  if (!isArray(value)) return false
  return value.every((v) => isString(v) || isBoolean(v))
}
