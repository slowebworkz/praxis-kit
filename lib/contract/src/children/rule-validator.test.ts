import { describe, expect, it, vi } from 'vitest'

import type { NormalizedChildRule, MatchMatrix } from '../types'
import { RuleValidator } from './rule-validator'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const throwValidator = new RuleValidator('Test', 'throw')
const warnValidator = new RuleValidator('Test', 'warn')
const silentValidator = new RuleValidator('Test', false)

function rule(overrides: Partial<NormalizedChildRule> & { name: string }): NormalizedChildRule {
  return {
    name: overrides.name,
    match: overrides.match ?? ((_: unknown): _ is unknown => true),
    cardinality: overrides.cardinality ?? { kind: 'unbounded' },
    position: overrides.position ?? 'any',
  }
}

function matrix(byRule: Set<number>[], _childCount = 3): MatchMatrix {
  const reverse = new Map<number, Set<number>>()
  for (const [ri, children] of byRule.entries()) {
    reverse.set(ri, children)
  }
  return { childToRules: { forward: new Map(), reverse } }
}

// ---------------------------------------------------------------------------
// Cardinality — min
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — cardinality min', () => {
  it('passes when match count equals min', () => {
    const r = rule({ name: 'child', cardinality: { kind: 'bounded', min: 1, max: Infinity } })
    const m = matrix([new Set([0])])
    expect(() => throwValidator.validate([r], m, 1)).not.toThrow()
  })

  it('passes when match count exceeds min', () => {
    const r = rule({ name: 'child', cardinality: { kind: 'bounded', min: 1, max: Infinity } })
    const m = matrix([new Set([0, 1])])
    expect(() => throwValidator.validate([r], m, 2)).not.toThrow()
  })

  it('throws when match count is below min', () => {
    const r = rule({ name: 'required', cardinality: { kind: 'bounded', min: 1, max: Infinity } })
    const m = matrix([new Set()])
    expect(() => throwValidator.validate([r], m, 0)).toThrow(/required/)
  })
})

// ---------------------------------------------------------------------------
// Cardinality — max
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — cardinality max', () => {
  it('passes when match count equals max', () => {
    const r = rule({ name: 'child', cardinality: { kind: 'bounded', min: 0, max: 2 } })
    const m = matrix([new Set([0, 1])])
    expect(() => throwValidator.validate([r], m, 2)).not.toThrow()
  })

  it('throws when match count exceeds max', () => {
    const r = rule({ name: 'once', cardinality: { kind: 'bounded', min: 0, max: 1 } })
    const m = matrix([new Set([0, 1])])
    expect(() => throwValidator.validate([r], m, 2)).toThrow(/once/)
  })
})

// ---------------------------------------------------------------------------
// Position — first
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — position "first"', () => {
  it('passes when matched child is at index 0', () => {
    const r = rule({
      name: 'header',
      cardinality: { kind: 'bounded', min: 0, max: 1 },
      position: 'first',
    })
    const m = matrix([new Set([0])], 3)
    expect(() => throwValidator.validate([r], m, 3)).not.toThrow()
  })

  it('throws when matched child is not at index 0', () => {
    const r = rule({
      name: 'header',
      cardinality: { kind: 'bounded', min: 0, max: 1 },
      position: 'first',
    })
    const m = matrix([new Set([1])], 3)
    expect(() => throwValidator.validate([r], m, 3)).toThrow(/header/)
  })
})

// ---------------------------------------------------------------------------
// Position — last
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — position "last"', () => {
  it('passes when matched child is at the final index', () => {
    const r = rule({
      name: 'footer',
      cardinality: { kind: 'bounded', min: 0, max: 1 },
      position: 'last',
    })
    const m = matrix([new Set([2])], 3)
    expect(() => throwValidator.validate([r], m, 3)).not.toThrow()
  })

  it('throws when matched child is not at the final index', () => {
    const r = rule({
      name: 'footer',
      cardinality: { kind: 'bounded', min: 0, max: 1 },
      position: 'last',
    })
    const m = matrix([new Set([0])], 3)
    expect(() => throwValidator.validate([r], m, 3)).toThrow(/footer/)
  })
})

// ---------------------------------------------------------------------------
// Position — any
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — position "any"', () => {
  it('passes regardless of child index', () => {
    const r = rule({
      name: 'free',
      cardinality: { kind: 'bounded', min: 0, max: 3 },
      position: 'any',
    })
    expect(() => throwValidator.validate([r], matrix([new Set([0])], 3), 3)).not.toThrow()
    expect(() => throwValidator.validate([r], matrix([new Set([1])], 3), 3)).not.toThrow()
    expect(() => throwValidator.validate([r], matrix([new Set([2])], 3), 3)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Multiple rules
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — multiple rules', () => {
  it('validates all rules and reports first violation', () => {
    const r1 = rule({ name: 'ok', cardinality: { kind: 'unbounded' } })
    const r2 = rule({ name: 'missing', cardinality: { kind: 'bounded', min: 1, max: Infinity } })
    const m = matrix([new Set([0]), new Set()], 1)
    expect(() => throwValidator.validate([r1, r2], m, 1)).toThrow(/missing/)
  })
})

// ---------------------------------------------------------------------------
// Edge case — no children
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — no children', () => {
  it('passes optional rules when there are no children', () => {
    const r = rule({ name: 'optional', cardinality: { kind: 'unbounded' } })
    const m = matrix([new Set()], 0)
    expect(() => throwValidator.validate([r], m, 0)).not.toThrow()
  })

  it('throws required rule violation when there are no children', () => {
    const r = rule({ name: 'required', cardinality: { kind: 'bounded', min: 1, max: Infinity } })
    const m = matrix([new Set()], 0)
    expect(() => throwValidator.validate([r], m, 0)).toThrow(/required/)
  })
})

// ---------------------------------------------------------------------------
// StrictMode behavior
// ---------------------------------------------------------------------------

describe('RuleValidator.validate() — StrictMode', () => {
  it('warns instead of throwing when strict is "warn"', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = rule({ name: 'required', cardinality: { kind: 'bounded', min: 1, max: Infinity } })
    const m = matrix([new Set()], 0)
    expect(() => warnValidator.validate([r], m, 0)).not.toThrow()
    await Promise.resolve()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is silent when strict is false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = rule({ name: 'required', cardinality: { kind: 'bounded', min: 1, max: Infinity } })
    const m = matrix([new Set()], 0)
    expect(() => silentValidator.validate([r], m, 0)).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
