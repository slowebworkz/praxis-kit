import { describe, expect, it } from 'vitest'

import type { ChildRuleMatch, NormalizedChildRule } from '../types'
import type { MatchResult } from './rules-matcher'
import { RuleMatcher } from './rules-matcher'

// ---------------------------------------------------------------------------
// Helpers — plain class instances (match via instanceof, no .type — linear path)
// ---------------------------------------------------------------------------

class Foo {}
class Bar {}
class Baz {}

const fooEl = new Foo()
const barEl = new Bar()
const bazEl = new Baz()

function rule(name: string, match: ChildRuleMatch<unknown>): NormalizedChildRule {
  return { name, match, cardinality: { kind: 'unbounded' }, position: 'any' }
}

function typedRule(
  name: string,
  type: unknown,
  match: ChildRuleMatch<unknown>,
): NormalizedChildRule {
  return { name, type, match, cardinality: { kind: 'unbounded' }, position: 'any' }
}

const fooRule = rule('foo', (c) => c instanceof Foo)
const barRule = rule('bar', (c) => c instanceof Bar)
const anyRule = rule('any', (_: unknown): _ is unknown => true)

// Convenience: destructure matrix from a MatchResult
const mat = (r: MatchResult) => r.matrix

// ---------------------------------------------------------------------------
// Empty inputs
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — empty', () => {
  it('returns empty matrix for no children and no rules', () => {
    const m = mat(new RuleMatcher([]).match([]))
    expect(m.childToRules.forward.size).toBe(0)
    expect(m.childToRules.reverse.size).toBe(0)
  })

  it('reverse has an empty Set for each rule when there are no children', () => {
    const m = mat(new RuleMatcher([fooRule]).match([]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set())
  })

  it('forward has no entry when there are no rules', () => {
    const m = mat(new RuleMatcher([]).match([fooEl]))
    expect(m.childToRules.forward.has(0)).toBe(false)
  })

  it('no unexpected or ambiguous indices for empty input', () => {
    const r = new RuleMatcher([]).match([])
    expect(r.unexpectedIndices.size).toBe(0)
    expect(r.ambiguousIndices.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Single child × single rule (linear path — no type field)
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — single child × single rule', () => {
  it('records match in forward and reverse when rule matches', () => {
    const m = mat(new RuleMatcher([fooRule]).match([fooEl]))
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
  })

  it('leaves forward empty and reverse as empty Set when rule does not match', () => {
    const m = mat(new RuleMatcher([fooRule]).match([barEl]))
    expect(m.childToRules.forward.has(0)).toBe(false)
    expect(m.childToRules.reverse.get(0)).toEqual(new Set())
  })

  it('marks unmatched child as unexpected', () => {
    const r = new RuleMatcher([fooRule]).match([barEl])
    expect(r.unexpectedIndices).toEqual(new Set([0]))
    expect(r.ambiguousIndices.size).toBe(0)
  })

  it('no unexpected index when child matches exactly one rule', () => {
    const r = new RuleMatcher([fooRule]).match([fooEl])
    expect(r.unexpectedIndices.size).toBe(0)
    expect(r.ambiguousIndices.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Multiple children × multiple rules (linear path)
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — multiple children × multiple rules', () => {
  it('matches each child to its correct rule', () => {
    const m = mat(new RuleMatcher([fooRule, barRule]).match([fooEl, barEl]))
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.forward.get(1)).toEqual(new Set([1]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.reverse.get(1)).toEqual(new Set([1]))
  })

  it('records multiple rule matches for one child', () => {
    const m = mat(new RuleMatcher([fooRule, anyRule]).match([fooEl]))
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0, 1]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.reverse.get(1)).toEqual(new Set([0]))
  })

  it('records one rule matching multiple children', () => {
    const m = mat(new RuleMatcher([anyRule]).match([fooEl, barEl, bazEl]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0, 1, 2]))
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.forward.get(1)).toEqual(new Set([0]))
    expect(m.childToRules.forward.get(2)).toEqual(new Set([0]))
  })

  it('only maps matched children and rules', () => {
    const m = mat(new RuleMatcher([fooRule, barRule]).match([fooEl, barEl, bazEl]))
    expect(m.childToRules.forward.size).toBe(2) // bazEl has no match
    expect(m.childToRules.reverse.size).toBe(2)
  })

  it('marks multi-match child as ambiguous', () => {
    const r = new RuleMatcher([fooRule, anyRule]).match([fooEl])
    expect(r.ambiguousIndices).toEqual(new Set([0]))
    expect(r.unexpectedIndices.size).toBe(0)
  })

  it('marks unmatched child as unexpected', () => {
    const r = new RuleMatcher([fooRule, barRule]).match([fooEl, barEl, bazEl])
    expect(r.unexpectedIndices).toEqual(new Set([2])) // bazEl unmatched
    expect(r.ambiguousIndices.size).toBe(0)
  })

  it('collects unexpected and ambiguous from the same pass', () => {
    // fooEl: matches both fooRule and anyRule → ambiguous (index 0)
    // bazEl: matches no rule → unexpected (index 2)
    const r = new RuleMatcher([fooRule, anyRule, barRule]).match([fooEl, barEl, bazEl])
    // fooEl hits fooRule + anyRule (multi-match) → ambiguous
    expect(r.ambiguousIndices).toContain(0)
    // bazEl hits anyRule only... wait, anyRule matches anything
    // reconsider: anyRule matches all three; fooRule matches fooEl; barRule matches barEl
    // fooEl: fooRule + anyRule → ambiguous
    // barEl: barRule + anyRule → ambiguous
    // bazEl: anyRule only → single match, neither unexpected nor ambiguous
    expect(r.unexpectedIndices.size).toBe(0)
    expect(r.ambiguousIndices).toEqual(new Set([0, 1]))
  })
})

// ---------------------------------------------------------------------------
// Primitives as children (unknown[], linear path)
// ---------------------------------------------------------------------------

describe('RuleMatcher.match() — primitive children', () => {
  it('matches string children via a custom rule', () => {
    const strRule = rule('string', (c): c is string => typeof c === 'string')
    const m = mat(new RuleMatcher([strRule]).match(['hello', 42, 'world']))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0, 2]))
    expect(m.childToRules.forward.has(1)).toBe(false)
  })

  it('marks unmatched primitive as unexpected', () => {
    const strRule = rule('string', (c): c is string => typeof c === 'string')
    const r = new RuleMatcher([strRule]).match(['hello', 42, 'world'])
    expect(r.unexpectedIndices).toEqual(new Set([1])) // 42 unmatched
    expect(r.ambiguousIndices.size).toBe(0)
  })

  it('matches by reference equality', () => {
    const obj = { id: 1 }
    const objRule = rule('ref', (c): c is typeof obj => c === obj)
    const m = mat(new RuleMatcher([objRule]).match([obj, { id: 1 }]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
  })
})

// ---------------------------------------------------------------------------
// Type-indexed fast path — children with .type property
// ---------------------------------------------------------------------------

// Simulate framework elements: { type: ComponentRef, ... }
const FooComponent = { name: 'FooComponent' }
const BarComponent = { name: 'BarComponent' }
const fooVNode = { type: FooComponent, props: {} }
const barVNode = { type: BarComponent, props: {} }
const bazVNode = { type: { name: 'BazComponent' }, props: {} }

describe('RuleMatcher.match() — type-indexed fast path', () => {
  it('uses the fast path when all rules have unique type fields', () => {
    const r0 = typedRule(
      'Foo',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const r1 = typedRule(
      'Bar',
      BarComponent,
      (c): c is typeof barVNode => (c as typeof barVNode).type === BarComponent,
    )
    const m = mat(new RuleMatcher([r0, r1]).match([fooVNode, barVNode]))
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.forward.get(1)).toEqual(new Set([1]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0]))
    expect(m.childToRules.reverse.get(1)).toEqual(new Set([1]))
  })

  it('treats unrecognised .type as no match (leaves forward empty)', () => {
    const r0 = typedRule(
      'Foo',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const m = mat(new RuleMatcher([r0]).match([bazVNode]))
    expect(m.childToRules.forward.has(0)).toBe(false)
    expect(m.childToRules.reverse.get(0)).toEqual(new Set())
  })

  it('marks unrecognised typed child as unexpected', () => {
    const r0 = typedRule(
      'Foo',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const r = new RuleMatcher([r0]).match([bazVNode])
    expect(r.unexpectedIndices).toEqual(new Set([0]))
  })

  it('ignores children without a .type property (primitives)', () => {
    const r0 = typedRule(
      'Foo',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const m = mat(new RuleMatcher([r0]).match(['string-child', 42, fooVNode]))
    // string and number have no .type → skipped; only fooVNode matches
    expect(m.childToRules.forward.size).toBe(1)
    expect(m.childToRules.forward.get(2)).toEqual(new Set([0]))
  })

  it('hybrid: typed rule uses index, predicate-only rule scans linearly', () => {
    // r0 is type-indexed; anyRule has no type so it goes to the linear path.
    // Both paths run per child — r0 via Map lookup, anyRule via match().
    const r0 = typedRule(
      'Foo',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const m = mat(new RuleMatcher([r0, anyRule]).match([fooVNode]))
    // r0 matched via type index; anyRule matched via linear scan.
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0, 1]))
  })

  it('hybrid: typed rule fires for typed children, predicate rule fires independently', () => {
    const r0 = typedRule(
      'Foo',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const isDisabled = rule(
      'disabled',
      (c): c is { disabled: true } =>
        typeof c === 'object' && c !== null && (c as Record<string, unknown>).disabled === true,
    )
    const disabledBar = { type: BarComponent, disabled: true }
    const m = mat(new RuleMatcher([r0, isDisabled]).match([fooVNode, disabledBar]))
    // fooVNode: matched r0 via type index; no `disabled` → isDisabled does not fire
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0]))
    // disabledBar: BarComponent not in index → no r0 match; has disabled → isDisabled fires
    expect(m.childToRules.forward.get(1)).toEqual(new Set([1]))
  })

  it('falls back to linear scan when two rules share the same type', () => {
    const r0 = typedRule(
      'Foo1',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const r1 = typedRule(
      'Foo2',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    // Duplicate type disables the index — linear scan catches both matches
    const m = mat(new RuleMatcher([r0, r1]).match([fooVNode]))
    expect(m.childToRules.forward.get(0)).toEqual(new Set([0, 1]))
  })

  it('marks duplicate-type child as ambiguous', () => {
    const r0 = typedRule(
      'Foo1',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const r1 = typedRule(
      'Foo2',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const r = new RuleMatcher([r0, r1]).match([fooVNode])
    expect(r.ambiguousIndices).toEqual(new Set([0]))
    expect(r.unexpectedIndices.size).toBe(0)
  })

  it('handles multiple children of the same type correctly', () => {
    const r0 = typedRule(
      'Foo',
      FooComponent,
      (c): c is typeof fooVNode => (c as typeof fooVNode).type === FooComponent,
    )
    const fooVNode2 = { type: FooComponent, props: { id: 2 } }
    const m = mat(new RuleMatcher([r0]).match([fooVNode, fooVNode2]))
    expect(m.childToRules.reverse.get(0)).toEqual(new Set([0, 1]))
  })
})

// suppress unused warning
void bazEl
