import { describe, expect, it } from 'vitest'

import type { ChildRuleContext, ChildRuleInput } from '../types'
import { ChildrenEvaluator } from './children-evaluator'
import type { ChildrenEvaluatorOptions } from './children-evaluator'
import { throwDiagnostics } from '@praxis-kit/diagnostics'
import { dynamic } from '@praxis-kit/primitive'

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

function makeEvaluator(
  rules: ChildRuleInput[],
  context = 'Test',
  options?: ChildrenEvaluatorOptions,
) {
  return new ChildrenEvaluator(rules, throwDiagnostics, context, options)
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
          throwDiagnostics,
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
          throwDiagnostics,
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
          throwDiagnostics,
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

describe('ChildrenEvaluator.evaluate() — unexpected child (exclusiveChildren: true)', () => {
  it('throws when a child matches no rule', () => {
    const ev = makeEvaluator([flexRule], 'Test', { exclusiveChildren: true })
    expect(() => ev.evaluate([gridEl])).toThrow()
  })

  it('error message names the context', () => {
    const ev = new ChildrenEvaluator([flexRule], throwDiagnostics, 'MyComponent', {
      exclusiveChildren: true,
    })
    expect(() => ev.evaluate([gridEl])).toThrow(/MyComponent/)
  })

  it('error message identifies the element type', () => {
    const ev = makeEvaluator([flexRule], 'Test', { exclusiveChildren: true })
    expect(() => ev.evaluate([gridEl])).toThrow(/Grid/)
  })
})

// ---------------------------------------------------------------------------
// evaluate() — open-by-default (no exclusiveChildren)
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — open by default', () => {
  it('allows a non-text child matching no rule when exclusiveChildren is unset', () => {
    const ev = makeEvaluator([flexRule])
    expect(() => ev.evaluate([gridEl])).not.toThrow()
  })

  it('allows a non-text child matching no rule when exclusiveChildren is explicitly false', () => {
    const ev = makeEvaluator([flexRule], 'Test', { exclusiveChildren: false })
    expect(() => ev.evaluate([gridEl])).not.toThrow()
  })

  it('a required rule (cardinality.min) does not forbid other unlisted children', () => {
    const requiredHeader: ChildRuleInput = {
      name: 'header',
      match: (c) => c instanceof Header,
      cardinality: { min: 1 },
    }
    const ev = makeEvaluator([requiredHeader])
    expect(() => ev.evaluate([headerEl, gridEl, flexEl])).not.toThrow()
  })

  it('still enforces cardinality.min for the declared rule even when open', () => {
    const requiredHeader: ChildRuleInput = {
      name: 'header',
      match: (c) => c instanceof Header,
      cardinality: { min: 1 },
    }
    const ev = makeEvaluator([requiredHeader])
    expect(() => ev.evaluate([gridEl])).toThrow(/header/)
  })
})

// ---------------------------------------------------------------------------
// evaluate() — text-node handling (allowText)
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — text-node handling', () => {
  it('allows string children by default even with exclusiveChildren: true', () => {
    const ev = makeEvaluator([flexRule], 'Test', { exclusiveChildren: true })
    expect(() => ev.evaluate(['Save', flexEl])).not.toThrow()
  })

  it('allows number children by default even with exclusiveChildren: true', () => {
    const ev = makeEvaluator([flexRule], 'Test', { exclusiveChildren: true })
    expect(() => ev.evaluate([42, flexEl])).not.toThrow()
  })

  it('rejects string children when allowText is false, even in open mode', () => {
    const ev = makeEvaluator([flexRule], 'Test', { allowText: false })
    expect(() => ev.evaluate(['Save'])).toThrow()
  })

  it('rejects number children when allowText is false, even in open mode', () => {
    const ev = makeEvaluator([flexRule], 'Test', { allowText: false })
    expect(() => ev.evaluate([7])).toThrow()
  })

  it('still allows non-text unlisted children when allowText is false but exclusiveChildren is unset', () => {
    const ev = makeEvaluator([flexRule], 'Test', { allowText: false })
    expect(() => ev.evaluate([gridEl])).not.toThrow()
  })

  it('rejects everything — text and elements — with exclusiveChildren: true and allowText: false', () => {
    const ev = makeEvaluator([], 'Test', { exclusiveChildren: true, allowText: false })
    expect(() => ev.evaluate(['Save'])).toThrow()
    expect(() => ev.evaluate([gridEl])).toThrow()
  })

  it('allows only text with exclusiveChildren: true and no rules (allowText default true)', () => {
    const ev = makeEvaluator([], 'Test', { exclusiveChildren: true })
    expect(() => ev.evaluate(['Save'])).not.toThrow()
    expect(() => ev.evaluate([gridEl])).toThrow()
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

// ---------------------------------------------------------------------------
// evaluate() — dynamic(...) cardinality
// ---------------------------------------------------------------------------

describe('ChildrenEvaluator.evaluate() — dynamic(...) cardinality', () => {
  // Mirrors the `as`-prop forcing example: a component whose `as` resolves to
  // 'section' requires exactly one Header, but resolves to a plain 'div' allows
  // any number (including zero).
  const headerRuleByTag: ChildRuleInput = {
    name: 'header',
    match: (c) => c instanceof Header,
    cardinality: dynamic((ctx: ChildRuleContext) =>
      ctx.tag === 'section' ? { min: 1, max: 1 } : { min: 0 },
    ),
  }

  it('throws when context is omitted and a rule has a dynamic cardinality', () => {
    const ev = makeEvaluator([headerRuleByTag])
    expect(() => ev.evaluate([headerEl, headerEl])).toThrow(RangeError)
  })

  it('resolves against the given context: section requires exactly one Header', () => {
    const ev = makeEvaluator([headerRuleByTag])
    const sectionCtx: ChildRuleContext = { tag: 'section', props: {} }
    expect(() => ev.evaluate([headerEl], sectionCtx)).not.toThrow()
    expect(() => ev.evaluate([headerEl, headerEl], sectionCtx)).toThrow(/header/)
    expect(() => ev.evaluate([], sectionCtx)).toThrow(/header/)
  })

  it('resolves against the given context: div allows any number of Headers', () => {
    const ev = makeEvaluator([headerRuleByTag])
    const divCtx: ChildRuleContext = { tag: 'div', props: {} }
    expect(() => ev.evaluate([], divCtx)).not.toThrow()
    expect(() => ev.evaluate([headerEl, headerEl, headerEl], divCtx)).not.toThrow()
  })

  it('re-resolves per call — the same evaluator instance honors a changed context', () => {
    const ev = makeEvaluator([headerRuleByTag])
    expect(() => ev.evaluate([], { tag: 'div', props: {} })).not.toThrow()
    expect(() => ev.evaluate([], { tag: 'section', props: {} })).toThrow(/header/)
  })

  it('mixes cleanly with static rules — static rules stay cached, dynamic ones re-resolve', () => {
    const ev = makeEvaluator([headerRuleByTag, footerRule])
    const sectionCtx: ChildRuleContext = { tag: 'section', props: {} }
    // header: exactly one (dynamic, section); footer: position="last" (static)
    expect(() => ev.evaluate([headerEl, footerEl], sectionCtx)).not.toThrow()
    expect(() => ev.evaluate([footerEl, headerEl], sectionCtx)).toThrow(/footer/)
  })

  it('still runs the position/cardinality invariant check against the resolved value', () => {
    const contradictory: ChildRuleInput = {
      name: 'header',
      match: (c) => c instanceof Header,
      position: 'first',
      cardinality: dynamic(() => ({ max: 2 })),
    }
    const ev = makeEvaluator([contradictory])
    expect(() => ev.evaluate([headerEl], { tag: 'section', props: {} })).toThrow(RangeError)
  })
})
