import { bench, describe } from 'vitest'
import { ChildrenEvaluator } from '@praxis-ui/core'

// strict: false — violations are silently swallowed so the matching work
// is measured without the cost of exception construction or console output.

const isString = (c: unknown): c is string => typeof c === 'string'
const isNumber = (c: unknown): c is number => typeof c === 'number'
const isStringOrNumber = (c: unknown): c is string | number =>
  typeof c === 'string' || typeof c === 'number'

const singleRuleEvaluator = new ChildrenEvaluator(
  [{ name: 'Item', match: isString, cardinality: { min: 1, max: 4 } }],
  false,
)

const twoRuleEvaluator = new ChildrenEvaluator(
  [
    { name: 'Header', match: isString, cardinality: { min: 1, max: 1 }, position: 'first' },
    { name: 'Body', match: isNumber, cardinality: { min: 1 } },
  ],
  false,
)

// Overlapping rules: a string child matches both Renderable and Text.
// Exercises the multi-match detection path in MatchValidator (matches.size > 1).
const overlapEvaluator = new ChildrenEvaluator(
  [
    { name: 'Renderable', match: isStringOrNumber },
    { name: 'Text', match: isString },
  ],
  false,
)

const CHILDREN_1 = ['a']
const CHILDREN_4 = ['a', 'b', 'c', 'd']
const CHILDREN_10 = Array.from({ length: 10 }, (_, i) => String(i))
const CHILDREN_50 = Array.from({ length: 50 }, (_, i) => String(i))
const MIXED_5 = ['header', 1, 2, 3, 4]

// Heterogeneous non-matching: different hidden classes per element.
// V8 cannot optimize predicate calls across polymorphic shapes — each typeof
// check sees a different value kind. All children are unexpected (no rule match).
const HETERO_NONMATCH = [{}, null, undefined, () => void 0, [], false]

// Overlapping: every string child matches both Renderable and Text rules.
const OVERLAP_4 = ['a', 'b', 'c', 'd']
const OVERLAP_MIXED_6 = ['a', 1, 'b', 2, 'c', 3] // strings hit both rules; numbers hit one

// Nested: arrays of arrays simulate React fragment/spread children that need
// pre-flattening before validation. ChildrenEvaluator takes a flat unknown[];
// this bench measures the flat() pre-processing cost relative to evaluation.
const NESTED_CHILDREN = [
  ['a', 'b'],
  ['c', 'd'],
  ['e', 'f', 'g', 'h'],
]

describe('ChildrenEvaluator.evaluate — single rule', () => {
  bench('1 child, passing', () => {
    singleRuleEvaluator.evaluate(CHILDREN_1)
  })

  bench('4 children, passing (at max)', () => {
    singleRuleEvaluator.evaluate(CHILDREN_4)
  })

  bench('10 children (exceeds max — violation path)', () => {
    singleRuleEvaluator.evaluate(CHILDREN_10)
  })

  bench('50 children (large set)', () => {
    singleRuleEvaluator.evaluate(CHILDREN_50)
  })
})

describe('ChildrenEvaluator.evaluate — two rules (mixed types)', () => {
  bench('5 children (1 header + 4 body), passing', () => {
    twoRuleEvaluator.evaluate(MIXED_5)
  })
})

// Heterogeneous shapes cause V8 predicate inline-cache misses: each element has
// a different hidden class, so match() call-sites become megamorphic.
// All children are unexpected — also exercises MatchValidator's error-build path.
describe('ChildrenEvaluator.evaluate — heterogeneous non-matching set', () => {
  bench('6 mixed-type non-matching children', () => {
    singleRuleEvaluator.evaluate(HETERO_NONMATCH)
  })
  bench('6 homogeneous non-matching children (all numbers, baseline)', () => {
    singleRuleEvaluator.evaluate([1, 2, 3, 4, 5, 6])
  })
})

// Overlapping rules: when a child matches multiple rules, RuleMatcher builds
// a multi-entry forward Set and MatchValidator runs the names-building path.
// Exposes ambiguity detection cost and backtracking in the match matrix.
describe('ChildrenEvaluator.evaluate — overlapping rule matches', () => {
  bench('4 strings (all match both Renderable + Text)', () => {
    overlapEvaluator.evaluate(OVERLAP_4)
  })
  bench('6 children, alternating overlap (strings hit both, numbers hit one)', () => {
    overlapEvaluator.evaluate(OVERLAP_MIXED_6)
  })
})

// Allocation pressure: spread creates a new array each iteration, mirroring
// React re-renders where children arrays are rebuilt. Stable reference bench
// shows what the evaluator costs without array allocation in the hot path.
describe('ChildrenEvaluator.evaluate — allocation pressure', () => {
  bench('stable array reference (50 children)', () => {
    singleRuleEvaluator.evaluate(CHILDREN_50)
  })
  bench('fresh array spread each call (50 children)', () => {
    singleRuleEvaluator.evaluate([...CHILDREN_50])
  })
})

// Nested children flattening: React children can arrive as nested arrays or
// fragments. ChildrenEvaluator requires a flat unknown[]; this bench measures
// the Array.flat() pre-processing cost vs the evaluation cost itself.
describe('ChildrenEvaluator.evaluate — nested flattening cost', () => {
  bench('pre-flattened stable (10 children)', () => {
    singleRuleEvaluator.evaluate(CHILDREN_10)
  })
  bench('flat() + evaluate (nested 3×[2-4] arrays)', () => {
    singleRuleEvaluator.evaluate(NESTED_CHILDREN.flat())
  })
})
