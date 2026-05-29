import { describe, expect, it } from 'vitest'

import type { ChildRuleMatch, NormalizedChildRule } from '../types'
import { RuleMatcher } from './rules-matcher'

const matcher = new RuleMatcher()

// ---------------------------------------------------------------------------
// Helpers — plain class instances (match via instanceof)
// ---------------------------------------------------------------------------

class Foo {}
class Bar {}
class Baz {}

const fooEl = new Foo()
const barEl = new Bar()
const bazEl = new Baz()

function rule(name: string, match: ChildRuleMatch<unknown>): NormalizedChildRule {
  return {
    name,
    match,
    cardinality: { kind: 'unbounded' },
    position: 'any',
  }
}

const fooRule = rule('foo', (c) => c instanceof Foo)
const barRule = rule('bar', (c) => c instanceof Bar)
const anyRule = rule('any', (_: unknown): _ is unknown => true)

// ---------------------------------------------------------------------------
// Empty inputs
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — empty', () => {
  it('returns empty matrix for no children and no rules', () => {
    const m = matcher.match([], [])
    expect(m.childToRules.forward.size).toBe(0)
    expect(m.childToRules.reverse.size).toBe(0)
  })

  it('reverse has an empty Set for each rule when there are no children', () => {
    const m = matcher.match([], [fooRule])
    expect(m.childToRules.reverse.get(0)).toEqual(new Set())
  })

  it('forward has no entry when there are no rules', () => {
    const m = matcher.match([fooEl], [])
    expect(m.childToRules.forward.has(0)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Single child × single rule
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — single child × single rule', () => {
  it('records match in forward and reverse when rule matches', () => {
    const m = matcher.match([fooEl], [fooRule])
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
  })

  it('leaves forward empty and reverse as empty Set when rule does not match', () => {
    const m = matcher.match([barEl], [fooRule])
    expect(m.childToRules.forward.has(0)).toBe(false)
    expect(m.childToRules.reverse.get(0)).toEqual(new Set())
  })
})

// ---------------------------------------------------------------------------
// Multiple children × multiple rules
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — multiple children × multiple rules', () => {
  it('matches each child to its correct rule', () => {
    const m = matcher.match([fooEl, barEl], [fooRule, barRule])
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.forward.get(1)).toEqual(new Set([1]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.reverse.get(1)).toEqual(new Set([1]))
  })

  it('records multiple rule matches for one child', () => {
    const m = matcher.match([fooEl], [fooRule, anyRule])
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0, 1]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.reverse.get(1)).toEqual(new Set([0]))
  })

  it('records one rule matching multiple children', () => {
    const m = matcher.match([fooEl, barEl, bazEl], [anyRule])
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0, 1, 2]))
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.forward.get(1)).toEqual(new Set([0]))
    expect(m.childToRules.forward.get(2)).toEqual(new Set([0]))
  })

  it('only maps matched children and rules', () => {
    const m = matcher.match([fooEl, barEl, bazEl], [fooRule, barRule])
    expect(m.childToRules.forward.size).toBe(2) // bazEl has no match
    expect(m.childToRules.reverse.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Primitives as children (unknown[])
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — primitive children', () => {
  it('matches string children via a custom rule', () => {
    const strRule = rule('string', (c): c is string => typeof c === 'string')
    const m = matcher.match(['hello', 42, 'world'], [strRule])
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0, 2]))
    expect(m.childToRules.forward.has(1)).toBe(false)
  })

  it('matches by reference equality', () => {
    const obj = { id: 1 }
    const objRule = rule('ref', (c): c is typeof obj => c === obj)
    const m = matcher.match([obj, { id: 1 }], [objRule])
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
  })
})

// suppress unused warning
void bazEl
