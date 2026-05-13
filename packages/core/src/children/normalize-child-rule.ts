import type { ChildRuleInput, NormalizedChildRule } from '../types'
import type { Cardinality, CardinalityInput } from '../types/child-rule'

function normalizeCardinality(
  input: CardinalityInput | undefined,
  impliesSingleton: boolean,
): Cardinality {
  const min = input?.min
  const max = input?.max ?? (impliesSingleton ? 1 : undefined)
  if (min === undefined && max === undefined) return { kind: 'unbounded' }
  return { kind: 'bounded', min: min ?? 0, max: max ?? Infinity }
}

export function normalizeChildRule(rule: ChildRuleInput): NormalizedChildRule {
  const position = rule.position ?? 'any'
  const impliesSingleton = position === 'first' || position === 'last'

  return {
    ...rule,
    position,
    cardinality: normalizeCardinality(rule.cardinality, impliesSingleton),
  }
}
