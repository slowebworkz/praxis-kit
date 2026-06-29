import { describe, expect, it } from 'vitest'

import type { ChildRuleInput } from '../types'
import { ChildrenEvaluator } from './children-evaluator'
import { diagnosticsFromStrictMode } from '../strict'

// ---------------------------------------------------------------------------
// Helpers — plain class instances
// ---------------------------------------------------------------------------

class Flex {}
class Grid {}
class Header {}
class Footer {}
class Body {}

const flexEl = new Flex()
const gridEl = new Grid()
const headerEl = new Header()
const footerEl = new Footer()
const bodyEl = new Body()

const flexRule: ChildRuleInput = {
  name: 'flex',
  match: (c) => c instanceof Flex,
}

const gridRule: ChildRuleInput = {
  name: 'grid',
  match: (c) => c instanceof Grid,
}

const headerRule: ChildRuleInput = {
  name: 'header',
  match: (c) => c instanceof Header,
  position: 'first',
}

const footerRule: ChildRuleInput = {
  name: 'footer',
  match: (c) => c instanceof Footer,
  position: 'last',
}

const bodyRule: ChildRuleInput = {
  name: 'body',
  match: (c) => c instanceof Body,
  cardinality: { min: 1, max: 3 },
}

function makeEvaluator(rules: ChildRuleInput[], context = 'Test') {
  return new ChildrenEvaluator(rules, diagnosticsFromStrictMode('throw'), context)
}

// ---------------------------------------------------------------------------
// Constructor validation
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator constructor', () => {
  it('throws RangeError when position="first" and explicit max > 1', () => {
    expect(
      () =>
        new ChildrenEvaluator(
          [
            {
              name: 'child',
              match: (_: unknown): _ is unknown => true,
              position: 'first',
              cardinality: { max: 2 },
            },
          ],
          diagnosticsFromStrictMode('throw'),
          'Test',
        ),
    ).toThrow(RangeError)
  })

  it('throws RangeError when position="last" and explicit max > 1', () => {
    expect(
      () =>
        new ChildrenEvaluator(
          [
            {
              name: 'child',
              match: (_: unknown): _ is unknown => true,
              position: 'last',
              cardinality: { max: 3 },
            },
          ],
          diagnosticsFromStrictMode('throw'),
          'Test',
        ),
    ).toThrow(RangeError)
  })

  it('does not throw for position="any" with any max', () => {
    expect(
      () =>
        new ChildrenEvaluator(
          [
            {
              name: 'child',
              match: (_: unknown): _ is unknown => true,
              position: 'any',
              cardinality: { max: 2 },
            },
          ],
          diagnosticsFromStrictMode('throw'),
          'Test',
        ),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// evaluate() — empty
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — empty children', () => {
  it('returns without error when children is empty', () => {
    const ev = makeEvaluator([flexRule])
    expect(() => ev.evaluate([])).not.toThrow()
  })

  it('returns without error when rules and children are both empty', () => {
    const ev = makeEvaluator([])
    expect(() => ev.evaluate([])).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// evaluate() — happy paths
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — valid children', () => {
  it('passes for a single child matching the only rule', () => {
    const ev = makeEvaluator([flexRule])
    expect(() => ev.evaluate([flexEl])).not.toThrow()
  })

  it('passes for multiple children each matching distinct rules', () => {
    const ev = makeEvaluator([flexRule, gridRule])
    expect(() => ev.evaluate([flexEl, gridEl])).not.toThrow()
  })

  it('passes when all optional rules are unmatched', () => {
    const ev = makeEvaluator([flexRule, gridRule])
    expect(() => ev.evaluate([flexEl])).not.toThrow()
  })

  it('passes with header (first), body, footer (last)', () => {
    const ev = makeEvaluator([headerRule, bodyRule, footerRule])
    expect(() => ev.evaluate([headerEl, bodyEl, footerEl])).not.toThrow()
  })

  it('passes with multiple body children within cardinality', () => {
    const ev = makeEvaluator([headerRule, bodyRule, footerRule])
    expect(() => ev.evaluate([headerEl, bodyEl, bodyEl, bodyEl, footerEl])).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// evaluate() — unexpected children
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — unexpected child', () => {
  it('throws when a child matches no rule', () => {
    const ev = makeEvaluator([flexRule])
    expect(() => ev.evaluate([gridEl])).toThrow()
  })

  it('error message names the context', () => {
    const ev = new ChildrenEvaluator([flexRule], diagnosticsFromStrictMode('throw'), 'MyComponent')
    expect(() => ev.evaluate([gridEl])).toThrow(/MyComponent/)
  })

  it('error message identifies the element type', () => {
    const ev = makeEvaluator([flexRule])
    expect(() => ev.evaluate([gridEl])).toThrow(/Grid/)
  })
})

// ---------------------------------------------------------------------------
// evaluate() — multiple rule matches
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — multiple rule matches', () => {
  it('throws when a child satisfies two rules', () => {
    const broadRule: ChildRuleInput = { name: 'broad', match: (_: unknown): _ is unknown => true }
    const ev = makeEvaluator([flexRule, broadRule])
    expect(() => ev.evaluate([flexEl])).toThrow()
  })

  it('error message lists the conflicting rule names', () => {
    const broadRule: ChildRuleInput = { name: 'broad', match: (_: unknown): _ is unknown => true }
    const ev = makeEvaluator([flexRule, broadRule])
    expect(() => ev.evaluate([flexEl])).toThrow(/flex/)
    expect(() => ev.evaluate([flexEl])).toThrow(/broad/)
  })
})

// ---------------------------------------------------------------------------
// evaluate() — cardinality
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — cardinality violations', () => {
  it('throws when min is not satisfied', () => {
    const required: ChildRuleInput = {
      name: 'required',
      match: (c) => c instanceof Flex,
      cardinality: { min: 1 },
    }
    const ev = makeEvaluator([required])
    expect(() => ev.evaluate([])).toThrow(/required/)
  })

  it('throws when max is exceeded', () => {
    const atMostOne: ChildRuleInput = {
      name: 'once',
      match: (c) => c instanceof Flex,
      cardinality: { max: 1 },
    }
    const ev = makeEvaluator([atMostOne])
    expect(() => ev.evaluate([flexEl, flexEl])).toThrow(/once/)
  })

  it('passes when count is exactly at min', () => {
    const ev = makeEvaluator([bodyRule])
    expect(() => ev.evaluate([bodyEl])).not.toThrow()
  })

  it('passes when count is exactly at max', () => {
    const ev = makeEvaluator([bodyRule])
    expect(() => ev.evaluate([bodyEl, bodyEl, bodyEl])).not.toThrow()
  })

  it('throws when body count exceeds max', () => {
    const ev = makeEvaluator([bodyRule])
    expect(() => ev.evaluate([bodyEl, bodyEl, bodyEl, bodyEl])).toThrow()
  })
})

// ---------------------------------------------------------------------------
// evaluate() — position
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — position violations', () => {
  it('throws when "first" child is not at index 0', () => {
    const ev = makeEvaluator([bodyRule, headerRule])
    expect(() => ev.evaluate([bodyEl, headerEl])).toThrow(/header/)
  })

  it('throws when "last" child is not at final index', () => {
    const ev = makeEvaluator([footerRule, bodyRule])
    expect(() => ev.evaluate([footerEl, bodyEl])).toThrow(/footer/)
  })

  it('passes when "first" child is correctly placed', () => {
    const ev = makeEvaluator([headerRule, bodyRule])
    expect(() => ev.evaluate([headerEl, bodyEl])).not.toThrow()
  })

  it('passes when "last" child is correctly placed', () => {
    const ev = makeEvaluator([bodyRule, footerRule])
    expect(() => ev.evaluate([bodyEl, footerEl])).not.toThrow()
  })
})
