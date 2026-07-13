import type { DynamicRule, Rule } from '../types'
import { isObject } from '../utils/is-object'
import { RULE_BRAND } from './rule-brand'

export function isDynamicRule<T, C>(rule: Rule<T, C>): rule is DynamicRule<T, C> {
  return isObject(rule, true) && (rule as Record<PropertyKey, unknown>)[RULE_BRAND] === true
}
