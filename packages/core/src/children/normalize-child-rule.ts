import type { ChildRuleInput, NormalizedChildRule } from '../types'
import type { Cardinality, CardinalityInput } from '../types/child-rule'

function normalizeCardinality(
  input: CardinalityInput | undefined,
  impliesSingleton: boolean,
): Cardinality {
  const min = input?.min
  const max = input?.max ?? (impliesSingleton ? 1 : undefined)
  if (min === undefined && max === undefined) return { kind: 'unbounded' }
  const effectiveMin = min ?? 0
  const effectiveMax = max ?? Infinity
  if (effectiveMin > effectiveMax) {
    throw new RangeError(
      `normalizeChildRule: min (${effectiveMin}) cannot exceed max (${effectiveMax})`,
    )
  }
  return { kind: 'bounded', min: effectiveMin, max: effectiveMax }
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
