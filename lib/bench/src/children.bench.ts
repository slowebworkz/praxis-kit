import { bench, describe } from 'vitest'
import { ChildrenEvaluator, diagnoseChildren } from '@praxis-ui/core'

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

const ButtonT = Symbol('Button')
const IconT = Symbol('Icon')
const BadgeT = Symbol('Badge')
const ListItemT = Symbol('ListItem')

const isButton = (c: unknown): c is { type: typeof ButtonT } =>
  typeof c === 'object' && c !== null && 'type' in c && (c as { type: unknown }).type === ButtonT
const isIcon = (c: unknown): c is { type: typeof IconT } =>
  typeof c === 'object' && c !== null && 'type' in c && (c as { type: unknown }).type === IconT
const isBadge = (c: unknown): c is { type: typeof BadgeT } =>
  typeof c === 'object' && c !== null && 'type' in c && (c as { type: unknown }).type === BadgeT
const isListItem = (c: unknown): c is { type: typeof ListItemT } =>
  typeof c === 'object' && c !== null && 'type' in c && (c as { type: unknown }).type === ListItemT

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

// All-typed: every rule carries a type field → O(n) dispatch via Map, no predicate scan.
const allTypedEvaluator = new ChildrenEvaluator(
  [
    { name: 'Button', match: isButton, type: ButtonT },
    { name: 'Icon', match: isIcon, type: IconT },
    { name: 'Badge', match: isBadge, type: BadgeT },
    { name: 'ListItem', match: isListItem, type: ListItemT },
  ],
  'warn',
)

// All-predicate: same rules, no type field → O(n×m) linear scan for every child.
const allPredicateEvaluator = new ChildrenEvaluator(
  [
    { name: 'Button', match: isButton },
    { name: 'Icon', match: isIcon },
    { name: 'Badge', match: isBadge },
    { name: 'ListItem', match: isListItem },
  ],
  'warn',
)

// Mixed: 2 typed (O(1) dispatch) + 2 predicate (still scanned for every child).
const mixedEvaluator = new ChildrenEvaluator(
  [
    { name: 'Button', match: isButton, type: ButtonT },
    { name: 'Icon', match: isIcon, type: IconT },
    { name: 'Badge', match: isBadge },
    { name: 'ListItem', match: isListItem },
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

const TYPES = [ButtonT, IconT, BadgeT, ListItemT] as const
const TYPED_10 = Array.from({ length: 10 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_50 = Array.from({ length: 50 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_100 = Array.from({ length: 100 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_500 = Array.from({ length: 500 }, (_, i) => el(TYPES[i % 4]!))
const TYPED_1000 = Array.from({ length: 1000 }, (_, i) => el(TYPES[i % 4]!))

// violation-path rule set (bounded max) — used only with diagnoseChildren
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

  // diagnoseChildren runs the matcher + builds a violations array without side effects.
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

// ── Heterogeneous non-matching ────────────────────────────────────────────────

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

// ── Overlapping rule matches ──────────────────────────────────────────────────

// When a child matches multiple rules, RuleMatcher builds a multi-entry forward Set
// and the ambiguity-detection path fires.
describe('RuleMatcher — overlapping rules (ambiguous children)', () => {
  bench('4 strings (all match both Renderable + Text)', () => {
    diagnoseChildren(OVERLAP_RULES, OVERLAP_4)
  })
  bench('6 children — strings hit both rules, numbers hit one', () => {
    diagnoseChildren(OVERLAP_RULES, OVERLAP_MIXED_6)
  })
})

// ── Typed vs predicate-only dispatch ─────────────────────────────────────────

// Isolates the O(1) type-index dispatch benefit over O(n×m) predicate scanning.
// Same children and same predicate logic in both evaluators; only the presence of
// the type field differs.
describe('RuleMatcher — typed vs predicate-only (4-rule contract)', () => {
  bench('10 children — all-typed', () => {
    allTypedEvaluator.evaluate(TYPED_10)
  })
  bench('10 children — all-predicate', () => {
    allPredicateEvaluator.evaluate(TYPED_10)
  })
  bench('10 children — mixed (2 typed + 2 predicate)', () => {
    mixedEvaluator.evaluate(TYPED_10)
  })

  bench('50 children — all-typed', () => {
    allTypedEvaluator.evaluate(TYPED_50)
  })
  bench('50 children — all-predicate', () => {
    allPredicateEvaluator.evaluate(TYPED_50)
  })
  bench('50 children — mixed', () => {
    mixedEvaluator.evaluate(TYPED_50)
  })

  bench('100 children — all-typed', () => {
    allTypedEvaluator.evaluate(TYPED_100)
  })
  bench('100 children — all-predicate', () => {
    allPredicateEvaluator.evaluate(TYPED_100)
  })
})

// ── Large component trees ─────────────────────────────────────────────────────

// Validates O(n) vs O(n×m) scaling at production-scale tree sizes.
describe('RuleMatcher — large trees', () => {
  bench('500 children — all-typed', () => {
    allTypedEvaluator.evaluate(TYPED_500)
  })
  bench('500 children — all-predicate', () => {
    allPredicateEvaluator.evaluate(TYPED_500)
  })

  bench('1000 children — all-typed', () => {
    allTypedEvaluator.evaluate(TYPED_1000)
  })
  bench('1000 children — all-predicate', () => {
    allPredicateEvaluator.evaluate(TYPED_1000)
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
