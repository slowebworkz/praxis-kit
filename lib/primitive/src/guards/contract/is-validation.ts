import type { ValidationResult, ValidationViolation } from '../../types'
import { isArray } from '../foundational/is-array'
import { isRecord } from '../foundational/is-record'
import { isString } from '../foundational/is-string'

export function isValidationViolation(value: unknown): value is ValidationViolation {
  if (!isRecord(value)) return false
  return isString(value['message']) && isString(value['tag'])
}

export function isValidationResult(value: unknown): value is ValidationResult {
  if (!isRecord(value)) return false
  return isRecord(value['props']) && isArray(value['violations'])
}
