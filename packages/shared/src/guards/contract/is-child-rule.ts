import type { ChildRuleInput, NormalizedChildRule } from '../../types'
import { isFunction } from '../foundational/is-function'
import { isRecord } from '../foundational/is-record'
import { isString } from '../foundational/is-string'
import { isCardinality } from './is-cardinality'

export function isChildRule(value: unknown): value is ChildRuleInput {
  if (!isRecord(value)) return false
  return isString(value['name']) && isFunction(value['match'])
}

export function isNormalizedChildRule(value: unknown): value is NormalizedChildRule {
  if (!isChildRule(value)) return false
  return isCardinality(value['cardinality']) && isString(value['position'])
}
