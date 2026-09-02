import type { DynamicRule } from './dynamic-rule'

export type Rule<T, C = unknown> = T | DynamicRule<T, C>
