import type { DynamicRule } from '../types'
import { RULE_BRAND } from './rule-brand'

export function dynamic<T, C = unknown>(resolve: (context: C) => T): DynamicRule<T, C> {
  return { [RULE_BRAND]: true, resolve }
}
