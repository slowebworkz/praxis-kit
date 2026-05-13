import { describe, expect, it, vi } from 'vitest'

import type { ChildIndex, MatchMatrix, RuleIndex } from '../types'
import { MatchValidator } from './match-validator'

// ---------------------------------------------------------------------------
// Helpers — plain class instances (getTypeName uses constructor.name)
// ---------------------------------------------------------------------------

class Foo {}
class Bar {}
class Baz {}

const fooEl = new Foo()
const barEl = new Bar()
const bazEl = new Baz()

function matrix(byChild: Set<number>[]): MatchMatrix {
  const forward = new Map<ChildIndex, Set<RuleIndex>>()
  for (const [i, rules] of byChild.entries()) {
    if (rules.size > 0) forward.set(i as ChildIndex, rules as unknown as Set<RuleIndex>)
  }
  return { childToRules: { forward, reverse: new Map() } }
}

const validator = new MatchValidator('Test', 'throw')
const noCtxValidator = new MatchValidator('', 'throw')
const warnValidator = new MatchValidator('Test', 'warn')
const silentValidator = new MatchValidator('Test', false)

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('MatchValidator — valid cases', () => {
  it('passes when each child matches exactly one rule', () => {
    const m = matrix([new Set([0]), new Set([1])])
    expect(() => validator.validate([fooEl, barEl], m, ['foo', 'bar'])).not.toThrow()
  })

  it('passes for single child with single match', () => {
    const m = matrix([new Set([0])])
    expect(() => validator.validate([fooEl], m, ['foo'])).not.toThrow()
  })

  it('passes for empty input', () => {
    const m = matrix([])
    expect(() => validator.validate([], m, [])).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Unexpected children
// ---------------------------------------------------------------------------

describe('MatchValidator — unexpected child', () => {
  it('throws when a child matches no rules', () => {
    const m = matrix([new Set()])
    expect(() => validator.validate([fooEl], m, ['bar'])).toThrow()
  })

  it('includes the class name in error (via constructor.name)', () => {
    const m = matrix([new Set()])
    expect(() => validator.validate([fooEl], m, ['bar'])).toThrow(/Foo/)
  })

  it('includes context when provided', () => {
    const m = matrix([new Set()])
    expect(() => validator.validate([fooEl], m, ['bar'])).toThrow(/Test/)
  })

  it('omits context prefix when empty', () => {
    const m = matrix([new Set()])
    expect(() => noCtxValidator.validate([fooEl], m, ['bar'])).toThrow(/Foo/)
  })
})

// ---------------------------------------------------------------------------
// Multiple matches
// ---------------------------------------------------------------------------

describe('MatchValidator — multiple matches', () => {
  it('throws when a child matches multiple rules', () => {
    const m = matrix([new Set([0, 1])])
    expect(() => validator.validate([fooEl], m, ['ruleA', 'ruleB'])).toThrow()
  })

  it('includes all conflicting rule names', () => {
    const m = matrix([new Set([0, 1])])
    expect(() => validator.validate([fooEl], m, ['ruleA', 'ruleB'])).toThrow(/ruleA/)
    expect(() => validator.validate([fooEl], m, ['ruleA', 'ruleB'])).toThrow(/ruleB/)
  })

  it('falls back to "#N" label when a rule index has no name entry', () => {
    const m = matrix([new Set([0, 1])])
    // ruleNames only covers index 0; index 1 is out of bounds → fallback '#1'
    expect(() => validator.validate([fooEl], m, ['ruleA'])).toThrow(/#1/)
  })

  it('includes the class name in error', () => {
    const m = matrix([new Set([0, 1])])
    expect(() => validator.validate([fooEl], m, ['ruleA', 'ruleB'])).toThrow(/Foo/)
  })
})

// ---------------------------------------------------------------------------
// Batch error aggregation
// ---------------------------------------------------------------------------

describe('MatchValidator — error batching', () => {
  it('collects multiple violations into one error', () => {
    const m = matrix([
      new Set(), // fooEl → unexpected
      new Set([0, 1]), // barEl → multiple matches
    ])

    let error: Error | null = null
    try {
      validator.validate([fooEl, barEl], m, ['ruleA', 'ruleB'])
    } catch (e) {
      error = e as Error
    }

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/Foo/)
    expect(error!.message).toMatch(/Bar/)
  })
})

// ---------------------------------------------------------------------------
// Readonly ruleNames support
// ---------------------------------------------------------------------------

describe('MatchValidator — readonly inputs', () => {
  it('accepts readonly rule names', () => {
    const names: readonly string[] = ['foo'] as const
    const m = matrix([new Set([0])])
    expect(() => validator.validate([fooEl], m, names)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// StrictMode behaviour
// ---------------------------------------------------------------------------

describe('MatchValidator — StrictMode', () => {
  it('warns instead of throwing when strict is "warn"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const m = matrix([new Set()])
    expect(() => warnValidator.validate([fooEl], m, ['bar'])).not.toThrow()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is silent when strict is false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const m = matrix([new Set()])
    expect(() => silentValidator.validate([fooEl], m, ['bar'])).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// suppress unused warning
void bazEl
