import { describe, expect, it } from 'vitest'

import { normalizeChildRule } from './normalize-child-rule'

const matchAll = (_: unknown): _ is unknown => true

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('normalizeChildRule() — defaults', () => {
  it('produces unbounded cardinality when none is provided', () => {
    const n = normalizeChildRule({ name: 'child', match: matchAll })
    expect(n.cardinality).toEqual({ kind: 'unbounded' })
  })

  it('sets position to "any" when omitted', () => {
    const n = normalizeChildRule({ name: 'child', match: matchAll })
    expect(n.position).toBe('any')
  })

  it('preserves the name', () => {
    const n = normalizeChildRule({ name: 'header', match: matchAll })
    expect(n.name).toBe('header')
  })

  it('preserves the match function', () => {
    const n = normalizeChildRule({ name: 'child', match: matchAll })
    expect(n.match).toBe(matchAll)
  })
})

// ---------------------------------------------------------------------------
// Position-implied cardinality
// ---------------------------------------------------------------------------

describe('normalizeChildRule() — position-implied max', () => {
  it('infers max=1 for position="first"', () => {
    const n = normalizeChildRule({ name: 'child', match: matchAll, position: 'first' })
    expect(n.cardinality).toEqual({ kind: 'bounded', min: 0, max: 1 })
  })

  it('infers max=1 for position="last"', () => {
    const n = normalizeChildRule({ name: 'child', match: matchAll, position: 'last' })
    expect(n.cardinality).toEqual({ kind: 'bounded', min: 0, max: 1 })
  })

  it('produces unbounded for position="any" with no cardinality', () => {
    const n = normalizeChildRule({ name: 'child', match: matchAll, position: 'any' })
    expect(n.cardinality).toEqual({ kind: 'unbounded' })
  })

  it('preserves explicit position', () => {
    const n = normalizeChildRule({ name: 'child', match: matchAll, position: 'first' })
    expect(n.position).toBe('first')
  })
})

// ---------------------------------------------------------------------------
// Explicit cardinality wins over inference
// ---------------------------------------------------------------------------

describe('normalizeChildRule() — explicit cardinality', () => {
  it('respects explicit cardinality over defaults', () => {
    const n = normalizeChildRule({
      name: 'child',
      match: matchAll,
      cardinality: { min: 2, max: 5 },
    })
    expect(n.cardinality).toEqual({ kind: 'bounded', min: 2, max: 5 })
  })

  it('respects explicit max even with position="first"', () => {
    const n = normalizeChildRule({
      name: 'child',
      match: matchAll,
      position: 'first',
      cardinality: { max: 1 },
    })
    expect(n.cardinality).toEqual({ kind: 'bounded', min: 0, max: 1 })
  })

  it('uses default min=0 when only max is provided', () => {
    const n = normalizeChildRule({
      name: 'child',
      match: matchAll,
      cardinality: { max: 3 },
    })
    expect(n.cardinality).toEqual({ kind: 'bounded', min: 0, max: 3 })
  })

  it('uses unbounded max when only min is provided', () => {
    const n = normalizeChildRule({
      name: 'child',
      match: matchAll,
      cardinality: { min: 1 },
    })
    expect(n.cardinality).toEqual({ kind: 'bounded', min: 1, max: Infinity })
  })
})

// ---------------------------------------------------------------------------
// Invalid cardinality
// ---------------------------------------------------------------------------

describe('normalizeChildRule() — invalid cardinality', () => {
  it('throws when min exceeds max', () => {
    expect(() =>
      normalizeChildRule({ name: 'child', match: matchAll, cardinality: { min: 5, max: 2 } }),
    ).toThrow(RangeError)
  })

  it('includes the conflicting values in the error message', () => {
    expect(() =>
      normalizeChildRule({ name: 'child', match: matchAll, cardinality: { min: 5, max: 2 } }),
    ).toThrow('min (5) cannot exceed max (2)')
  })

  it('accepts min equal to max', () => {
    const n = normalizeChildRule({
      name: 'child',
      match: matchAll,
      cardinality: { min: 3, max: 3 },
    })
    expect(n.cardinality).toEqual({ kind: 'bounded', min: 3, max: 3 })
  })
})
