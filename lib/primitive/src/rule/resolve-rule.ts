import type { Rule } from '../types'
import { isDynamicRule } from './is-dynamic-rule'

export function resolveRule<T, C>(rule: Rule<T, C>, context: C): T {
  return isDynamicRule(rule) ? rule.resolve(context) : rule
}
