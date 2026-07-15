import type { Cardinality, CardinalityInput, ChildRuleInput, NormalizedChildRule } from '../types'

/**
 * A `ChildRuleInput` whose `cardinality` has already been resolved (via
 * `resolveRule`) down to a plain `CardinalityInput` — the shape
 * `normalizeChildRule` operates on. `ChildrenEvaluator` produces this for
 * both static rules (cardinality was never dynamic) and dynamic rules
 * (resolved against a `ChildRuleContext` immediately before normalizing).
 */
export type ResolvedChildRuleInput<T = unknown, U extends T = T> = Omit<
  ChildRuleInput<T, U>,
  'cardinality'
> & {
  cardinality?: CardinalityInput
}

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

export function normalizeChildRule(rule: ResolvedChildRuleInput): NormalizedChildRule {
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
