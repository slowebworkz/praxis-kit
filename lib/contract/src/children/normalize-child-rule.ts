import type { Cardinality, CardinalityInput, ChildRuleInput, NormalizedChildRule } from '../types'

function normalizeCardinality(
  input: CardinalityInput | undefined,
  impliesSingleton: boolean,
): Cardinality {
  const min = input?.min ?? 0
  const max = input?.max ?? (impliesSingleton ? 1 : Infinity)

  if (min === 0 && max === Infinity) {
    return { kind: 'unbounded' }
  }

  if (min > max) {
    throw new RangeError(`normalizeChildRule: min (${min}) cannot exceed max (${max})`)
  }

  return {
    kind: 'bounded',
    min,
    max,
  }
}

export function normalizeChildRule(rule: ChildRuleInput): NormalizedChildRule {
  const position = rule.position ?? 'any'
  // position='first'|'last' targets exactly one child by definition; callers who omit max
  // get max=1 for free. An explicit max>1 is rejected by ChildrenEvaluator as contradictory.
  const impliesSingleton = position === 'first' || position === 'last'

  return {
    ...rule,
    position,
    cardinality: normalizeCardinality(rule.cardinality, impliesSingleton),
  }
}
