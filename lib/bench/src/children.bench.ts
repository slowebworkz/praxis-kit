import { bench, describe } from 'vitest'
import { ChildrenEvaluator, diagnoseChildren } from '@praxis-ui/core'
import { isObject } from '@praxis-ui/primitive'

// strict:'warn' — evaluate() runs the full match cycle. Unbounded-cardinality rules
// ensure passing-path children never trigger console.warn.
// diagnoseChildren is used for violation-path suites: it runs the matcher and returns
// violations as a plain array without throws or console.warn.

const isString = (c: unknown): c is string => typeof c === 'string'
const isNumber = (c: unknown): c is number => typeof c === 'number'
const isStringOrNumber = (c: unknown): c is string | number =>
  typeof c === 'string' || typeof c === 'number'

// ── Type tokens ───────────────────────────────────────────────────────────────
// Symbols stand in for component-function references (e.g. a React element's .type).
// getChildType reads child.type — the same path real framework elements take.

const AT = Symbol('A')
const BT = Symbol('B')
const CT = Symbol('C')
const DT = Symbol('D')

const isA = (c: unknown): c is { type: typeof AT } =>
  isObject(c) && 'type' in c && (c as { type: unknown }).type === AT
const isB = (c: unknown): c is { type: typeof BT } =>
  isObject(c) && 'type' in c && (c as { type: unknown }).type === BT
const isC = (c: unknown): c is { type: typeof CT } =>
  isObject(c) && 'type' in c && (c as { type: unknown }).type === CT
const isD = (c: unknown): c is { type: typeof DT } =>
  isObject(c) && 'type' in c && (c as { type: unknown }).type === DT

const el = (type: symbol): { type: symbol } => ({ type })

// ── Evaluators ────────────────────────────────────────────────────────────────

const singlePredicateEvaluator = new ChildrenEvaluator([{ name: 'Item', match: isString }], 'warn')

const twoRuleEvaluator = new ChildrenEvaluator(
  [
    { name: 'Header', match: isString, cardinality: { min: 1, max: 1 }, position: 'first' },
    { name: 'Body', match: isNumber, cardinality: { min: 1 } },
  ],
  'warn',
)

// ── Rule index expansion: fallback-frequency evaluators ───────────────────────
// 4-rule contracts with varying proportions of typed (indexed) vs predicate rules.
// Measures how the O(n×m_untyped) fallback cost scales with fallback rate.

// 0% typed — all 4 rules predicate-only: every child requires 4 predicate calls
const pct0TypedEvaluator = new ChildrenEvaluator(
  [
    { name: 'A', match: isA },
    { name: 'B', match: isB },
    { name: 'C', match: isC },
    { name: 'D', match: isD },
  ],
  'warn',
)

// 25% typed — 1 of 4 rules indexed: matched children skip 1 predicate, still scan 3
const pct25TypedEvaluator = new ChildrenEvaluator(
  [
    { name: 'A', match: isA, type: AT },
    { name: 'B', match: isB },
    { name: 'C', match: isC },
    { name: 'D', match: isD },
  ],
  'warn',
)

// 50% typed — 2 of 4 rules indexed: two rule types dispatched O(1), two scan
const pct50TypedEvaluator = new ChildrenEvaluator(
  [
    { name: 'A', match: isA, type: AT },
    { name: 'B', match: isB, type: BT },
    { name: 'C', match: isC },
    { name: 'D', match: isD },
  ],
  'warn',
)

// 75% typed — 3 of 4 rules indexed: only 1 rule requires predicate scan
const pct75TypedEvaluator = new ChildrenEvaluator(
  [
    { name: 'A', match: isA, type: AT },
    { name: 'B', match: isB, type: BT },
    { name: 'C', match: isC, type: CT },
    { name: 'D', match: isD },
  ],
  'warn',
)

// 100% typed — all 4 rules indexed: O(n) dispatch, zero predicate calls
const pct100TypedEvaluator = new ChildrenEvaluator(
  [
    { name: 'A', match: isA, type: AT },
    { name: 'B', match: isB, type: BT },
    { name: 'C', match: isC, type: CT },
    { name: 'D', match: isD, type: DT },
  ],
  'warn',
)

// ── Children arrays ───────────────────────────────────────────────────────────

const CHILDREN_1 = ['a']
const CHILDREN_4 = ['a', 'b', 'c', 'd']
const CHILDREN_10 = Array.from({ length: 10 }, (_, i) => String(i))
const CHILDREN_50 = Array.from({ length: 50 }, (_, i) => String(i))
const MIXED_5 = ['header', 1, 2, 3, 4]

const HETERO_NONMATCH = [{}, null, undefined, () => void 0, [], false]
const OVERLAP_4 = ['a', 'b', 'c', 'd']
const OVERLAP_MIXED_6 = ['a', 1, 'b', 2, 'c', 3]

const NESTED_CHILDREN = [
  ['a', 'b'],
  ['c', 'd'],
  ['e', 'f', 'g', 'h'],
]

const TYPES = [AT, BT, CT, DT] as const
const TYPED_20 = Array.from({ length: 20 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_50 = Array.from({ length: 50 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_100 = Array.from({ length: 100 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_500 = Array.from({ length: 500 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_1000 = Array.from({ length: 1000 }, (_, i) => el(TYPES[i % 4]!))

const BOUNDED_RULE = [{ name: 'Item', match: isString, cardinality: { max: 4 } }]
const OVERLAP_RULES = [
  { name: 'Renderable', match: isStringOrNumber },
  { name: 'Text', match: isString },
]
const NONMATCH_RULE = [{ name: 'Item', match: isString }]

// ── Single predicate rule ─────────────────────────────────────────────────────

describe('RuleMatcher — single predicate rule', () => {
  bench('1 child', () => {
    singlePredicateEvaluator.evaluate(CHILDREN_1)
  })

  bench('4 children', () => {
    singlePredicateEvaluator.evaluate(CHILDREN_4)
  })

  bench('10 children', () => {
    singlePredicateEvaluator.evaluate(CHILDREN_10)
  })

  bench('50 children', () => {
    singlePredicateEvaluator.evaluate(CHILDREN_50)
  })

  bench('10 children, max=4 — cardinality-max violation', () => {
    diagnoseChildren(BOUNDED_RULE, CHILDREN_10)
  })
})

// ── Two-rule positional contract ──────────────────────────────────────────────

describe('RuleMatcher — two predicate rules, positional', () => {
  bench('5 children (1 header + 4 body), passing', () => {
    twoRuleEvaluator.evaluate(MIXED_5)
  })
})

// ── Unexpected children ───────────────────────────────────────────────────────

// V8 cannot optimize predicate calls across polymorphic shapes — each element has
// a different hidden class, so typeof checks at call sites become megamorphic.
describe('RuleMatcher — unexpected children', () => {
  bench('6 mixed-type non-matching (unexpected path)', () => {
    diagnoseChildren(NONMATCH_RULE, HETERO_NONMATCH)
  })
  bench('6 homogeneous non-matching, all numbers (baseline)', () => {
    diagnoseChildren(NONMATCH_RULE, [1, 2, 3, 4, 5, 6])
  })
})

// ── Overlapping rules ─────────────────────────────────────────────────────────

// When a child matches multiple rules, the ambiguity-detection path fires.
describe('RuleMatcher — overlapping rules (ambiguous children)', () => {
  bench('4 strings (all match both Renderable + Text)', () => {
    diagnoseChildren(OVERLAP_RULES, OVERLAP_4)
  })
  bench('6 children — strings hit both rules, numbers hit one', () => {
    diagnoseChildren(OVERLAP_RULES, OVERLAP_MIXED_6)
  })
})

// ── Rule index expansion: fallback-frequency measurement ─────────────────────
//
// Each suite holds 4 rules. Typed rules are O(1) dispatch; predicate rules are
// O(m_untyped) linear scan per child. The suites vary the typed:predicate ratio
// from 0% to 100% to show how fallback frequency affects throughput.
//
// All children carry a .type symbol, so Phase 1 always runs. Predicate rules
// receive 0 matches from Phase 1 and proceed to Phase 2.

describe('RuleMatcher — rule index expansion (fallback frequency, 4 rules, 50 children)', () => {
  bench('0% typed — 4 predicate rules (full fallback scan)', () => {
    pct0TypedEvaluator.evaluate(TYPED_50)
  })
  bench('25% typed — 1 indexed, 3 predicate', () => {
    pct25TypedEvaluator.evaluate(TYPED_50)
  })
  bench('50% typed — 2 indexed, 2 predicate', () => {
    pct50TypedEvaluator.evaluate(TYPED_50)
  })
  bench('75% typed — 3 indexed, 1 predicate', () => {
    pct75TypedEvaluator.evaluate(TYPED_50)
  })
  bench('100% typed — 4 indexed (no fallback scan)', () => {
    pct100TypedEvaluator.evaluate(TYPED_50)
  })
})

describe('RuleMatcher — rule index expansion (fallback frequency, 4 rules, 20 children)', () => {
  bench('0% typed', () => {
    pct0TypedEvaluator.evaluate(TYPED_20)
  })
  bench('100% typed', () => {
    pct100TypedEvaluator.evaluate(TYPED_20)
  })
})

// ── Large component trees ─────────────────────────────────────────────────────

describe('RuleMatcher — large trees', () => {
  bench('100 children — all-typed', () => {
    pct100TypedEvaluator.evaluate(TYPED_100)
  })
  bench('100 children — all-predicate', () => {
    pct0TypedEvaluator.evaluate(TYPED_100)
  })
  bench('500 children — all-typed', () => {
    pct100TypedEvaluator.evaluate(TYPED_500)
  })
  bench('500 children — all-predicate', () => {
    pct0TypedEvaluator.evaluate(TYPED_500)
  })
  bench('1000 children — all-typed', () => {
    pct100TypedEvaluator.evaluate(TYPED_1000)
  })
  bench('1000 children — all-predicate', () => {
    pct0TypedEvaluator.evaluate(TYPED_1000)
  })
})

// ── Allocation pressure ───────────────────────────────────────────────────────

// Spread creates a new array each iteration, mirroring React re-renders where the
// children array is rebuilt. Stable reference shows evaluator cost in isolation.
describe('RuleMatcher — allocation pressure', () => {
  bench('stable array reference (50 children)', () => {
    singlePredicateEvaluator.evaluate(CHILDREN_50)
  })
  bench('fresh array spread per call (50 children)', () => {
    singlePredicateEvaluator.evaluate([...CHILDREN_50])
  })
})

// ── Nested flattening cost ────────────────────────────────────────────────────

// ChildrenEvaluator takes a flat unknown[]. This bench measures Array.flat()
// pre-processing cost vs the evaluation cost itself.
describe('RuleMatcher — nested flattening cost', () => {
  bench('pre-flattened (10 children)', () => {
    singlePredicateEvaluator.evaluate(CHILDREN_10)
  })
  bench('flat() + evaluate (nested 3×[2-4] arrays)', () => {
    singlePredicateEvaluator.evaluate(NESTED_CHILDREN.flat())
  })
})
