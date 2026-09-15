/**
 * Lightweight completeness/correctness tests for the builder functions `html-nesting.ts` uses to
 * construct `TAG_CATEGORIES`/`HTML_CONTENT_MODELS`. Not an attempt at "every HTML element is
 * present" coverage (see that file's own comment on why that's not the goal) — these check the
 * builders themselves produce well-formed, correctly-shaped values, since this file had zero
 * test coverage before.
 *
 * One invariant intentionally NOT tested here: "every tag referenced by a `specific()` rule
 * exists in `TAG_CATEGORIES`." Checked against the real validator (`no-invalid-html-nesting.ts`'s
 * `isAllowed`) and confirmed that's not an actual relationship in this system — a `specific`-kind
 * model checks `model.allowed.has(childTag)` directly and never consults `TAG_CATEGORIES` at all;
 * only `category`-kind models do. So a `specific()` rule's tags have no dependency on
 * `TAG_CATEGORIES` to test.
 *
 * "Every category map entry uses only recognized categories" is also not tested here — it's
 * enforced at compile time (`categories()`'s parameter type is `readonly ContentCategory[]`, a
 * closed union), so no runtime value can violate it without an `as any` escape hatch a real
 * caller wouldn't use.
 */
import { describe, expect, it } from 'vitest'
import {
  categoriesFor,
  categories,
  category,
  categoryRule,
  choice,
  constrained,
  defineContentModel,
  defineContentModels,
  flow,
  heading,
  interspersed,
  noDescendantAttribute,
  noDescendantCategory,
  noDescendantTag,
  nothing,
  oneOrMore,
  optional,
  phrasing,
  phrasingOrHeading,
  sequence,
  specific,
  structured,
  tag,
  tags,
  transparent,
  zeroOrMore,
} from './content-model-builders'

describe('sets', () => {
  it('categories() collects its arguments into a Set', () => {
    expect(categories('flow', 'phrasing')).toEqual(new Set(['flow', 'phrasing']))
  })

  it('tags() collects its arguments into a Set', () => {
    expect(tags('div', 'span')).toEqual(new Set(['div', 'span']))
  })
})

describe('content model builders', () => {
  it('category() builds a category-kind model with the given categories', () => {
    expect(category('phrasing', 'heading')).toEqual({
      model: { kind: 'category', allowed: new Set(['phrasing', 'heading']) },
    })
  })

  it('specific() builds a specific-kind model with the given tags', () => {
    expect(specific('td', 'th')).toEqual({
      model: { kind: 'specific', allowed: new Set(['td', 'th']) },
    })
  })

  it('transparent() builds a transparent-kind model with no allowed set', () => {
    expect(transparent()).toEqual({ model: { kind: 'transparent' } })
  })

  it('nothing() builds a nothing-kind model', () => {
    expect(nothing()).toEqual({ model: { kind: 'nothing' } })
  })

  it('structured() wraps a ContentRule in a structured-kind model', () => {
    const rule = tag('td')
    expect(structured(rule)).toEqual({ model: { kind: 'structured', rule } })
  })
})

describe('semantic model helpers', () => {
  it('phrasing() is category("phrasing")', () => {
    expect(phrasing()).toEqual(category('phrasing'))
  })

  it('flow() is category("flow")', () => {
    expect(flow()).toEqual(category('flow'))
  })

  it('heading() is category("heading")', () => {
    expect(heading()).toEqual(category('heading'))
  })

  it('phrasingOrHeading() is category("phrasing", "heading")', () => {
    expect(phrasingOrHeading()).toEqual(category('phrasing', 'heading'))
  })
})

describe('structured content-model rules', () => {
  it('tag() builds a tag rule', () => {
    expect(tag('caption')).toEqual({ kind: 'tag', tag: 'caption' })
  })

  it('categoryRule() builds a category rule', () => {
    expect(categoryRule('flow')).toEqual({ kind: 'category', category: 'flow' })
  })

  it('sequence() builds a sequence rule preserving item order', () => {
    const items = [tag('caption'), tag('colgroup')]
    expect(sequence(...items)).toEqual({ kind: 'sequence', items })
  })

  it('choice() builds a choice rule preserving item order', () => {
    const items = [tag('tbody'), tag('tr')]
    expect(choice(...items)).toEqual({ kind: 'choice', items })
  })

  it('optional() wraps a single item', () => {
    const item = tag('caption')
    expect(optional(item)).toEqual({ kind: 'optional', item })
  })

  it('zeroOrMore() wraps a single item', () => {
    const item = tag('colgroup')
    expect(zeroOrMore(item)).toEqual({ kind: 'zero-or-more', item })
  })

  it('oneOrMore() wraps a single item', () => {
    const item = tag('tr')
    expect(oneOrMore(item)).toEqual({ kind: 'one-or-more', item })
  })

  it('interspersed() wraps an item with an allowed tag set', () => {
    const item = tag('tr')
    expect(interspersed(item, 'script', 'template')).toEqual({
      kind: 'interspersed',
      item,
      allowed: new Set(['script', 'template']),
    })
  })
})

describe('constraints', () => {
  it('noDescendantCategory() builds a no-descendant-category constraint', () => {
    expect(noDescendantCategory('interactive')).toEqual({
      kind: 'no-descendant-category',
      category: 'interactive',
    })
  })

  it('noDescendantTag() builds a no-descendant-tag constraint', () => {
    expect(noDescendantTag('a')).toEqual({ kind: 'no-descendant-tag', tag: 'a' })
  })

  it('noDescendantAttribute() builds a no-descendant-attribute constraint', () => {
    expect(noDescendantAttribute('tabindex')).toEqual({
      kind: 'no-descendant-attribute',
      attribute: 'tabindex',
    })
  })
})

describe('definition helpers', () => {
  it('defineContentModel() omits constraints when none are given', () => {
    const model = category('phrasing').model
    expect(defineContentModel(model)).toEqual({ model })
  })

  it('defineContentModel() attaches constraints when given', () => {
    const model = category('phrasing').model
    const constraint = noDescendantTag('a')
    expect(defineContentModel(model, [constraint])).toEqual({ model, constraints: [constraint] })
  })

  it('constrained() is a no-op when no constraints are given', () => {
    const definition = phrasing()
    expect(constrained(definition)).toBe(definition)
  })

  it('constrained() attaches a constraint to a definition with none yet', () => {
    const definition = phrasing()
    const constraint = noDescendantTag('a')
    expect(constrained(definition, constraint)).toEqual({
      ...definition,
      constraints: [constraint],
    })
  })

  it('constrained() appends to, rather than replaces, existing constraints', () => {
    const first = noDescendantTag('a')
    const second = noDescendantCategory('interactive')
    const definition = constrained(phrasing(), first)
    expect(constrained(definition, second)).toEqual({
      ...definition,
      constraints: [first, second],
    })
  })
})

describe('map helpers', () => {
  it('categoriesFor() applies the same category set to every listed tag', () => {
    const result = categoriesFor(['flow', 'phrasing'], ['em', 'strong'])
    expect(result).toEqual({
      em: new Set(['flow', 'phrasing']),
      strong: new Set(['flow', 'phrasing']),
    })
  })

  it('categoriesFor() returns an empty object for an empty tag list', () => {
    expect(categoriesFor(['flow'], [])).toEqual({})
  })

  it('defineContentModels() is the identity function', () => {
    const definitions = { td: specific(), tr: specific('td', 'th') }
    expect(defineContentModels(definitions)).toBe(definitions)
  })
})
