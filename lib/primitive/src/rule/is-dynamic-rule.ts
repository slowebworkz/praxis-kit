import type { DynamicRule, Rule } from '../types'
import { isNonNullObject } from 'guardz'
import { RULE_BRAND } from './rule-brand'

export function isDynamicRule<T, C>(rule: Rule<T, C>): rule is DynamicRule<T, C> {
  return isNonNullObject(rule) && Reflect.get(rule, RULE_BRAND) === true
}
