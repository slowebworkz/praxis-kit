import { bench, describe } from 'vitest'
import { ChildrenEvaluator } from '@polymorphic-ui/core'

// strict: false — violations are silently swallowed so the matching work
// is measured without the cost of exception construction or console output.

const isString = (c: unknown): c is string => typeof c === 'string'
const isNumber = (c: unknown): c is number => typeof c === 'number'

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

const CHILDREN_1 = ['a']
const CHILDREN_4 = ['a', 'b', 'c', 'd']
const CHILDREN_10 = Array.from({ length: 10 }, (_, i) => String(i))
const CHILDREN_50 = Array.from({ length: 50 }, (_, i) => String(i))
const MIXED_5 = ['header', 1, 2, 3, 4]

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
