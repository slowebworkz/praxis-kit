import { describe, it, expectTypeOf } from 'vitest'
import type { ChildRuleInput, ChildrenEvaluator } from '@praxis-kit/core'
import type { BuiltChildrenEvaluator } from './built-children-evaluator'

// `BuiltChildrenEvaluator<TOptions>` must agree with `buildEngines`, which constructs a
// `ChildrenEvaluator` when childRules are present OR exclusiveChildren OR allowText === false.
// The option shapes below mirror `EnforcementOptions` (a `children?` slot is always present).

type Enforcement<E> = { enforcement: { children?: readonly ChildRuleInput[] } & E }

type HasEvaluator<E> =
  BuiltChildrenEvaluator<Enforcement<E>> extends { childrenEvaluator: ChildrenEvaluator }
    ? true
    : false

describe('BuiltChildrenEvaluator', () => {
  it('includes the evaluator when child rules are declared', () => {
    expectTypeOf<
      HasEvaluator<{ children: readonly [ChildRuleInput] }>
    >().toEqualTypeOf<true>()
  })

  it('includes the evaluator for exclusiveChildren: true with no rules', () => {
    expectTypeOf<HasEvaluator<{ exclusiveChildren: true }>>().toEqualTypeOf<true>()
  })

  it('includes the evaluator for allowText: false with no rules', () => {
    expectTypeOf<HasEvaluator<{ allowText: false }>>().toEqualTypeOf<true>()
  })

  it('omits the evaluator when nothing forces child enforcement', () => {
    expectTypeOf<HasEvaluator<{ exclusiveChildren: false }>>().toEqualTypeOf<false>()
    expectTypeOf<HasEvaluator<{ allowText: true }>>().toEqualTypeOf<false>()
    expectTypeOf<HasEvaluator<Record<never, never>>>().toEqualTypeOf<false>()
  })
})
