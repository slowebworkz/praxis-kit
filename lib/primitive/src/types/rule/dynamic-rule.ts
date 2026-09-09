import type { RULE_BRAND } from '../../rule/rule-brand'

export type DynamicRule<T, C = unknown> = {
  readonly [RULE_BRAND]: true
  resolve(context: C): T
}
