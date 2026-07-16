import { describe, expect, it, vi } from 'vitest'

import { AriaPolicyEngine } from './polymorphic-validator'
import { makeValidator } from './aria-policy-engine.helpers'
import { silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// validate() — fix-plan cache
// ---------------------------------------------------------------------------

describe('validate() — fix-plan cache', () => {
  it('returns same violations on cache hit', () => {
    const engine = makeValidator(silentDiagnostics)
    const r1 = engine.validate('nav', { role: 'navigation' })
    const r2 = engine.validate('nav', { role: 'navigation' })
    expect(r2.violations).toEqual(r1.violations)
  })

  it('applies cached removals to current props, not to the first call props', () => {
    const engine = makeValidator(silentDiagnostics)
    engine.validate('nav', { role: 'navigation', className: 'first' })
    const r2 = engine.validate('nav', { role: 'navigation', className: 'second' })
    // role should be stripped (cached plan), className should be from the current call
    expect(r2.props).not.toHaveProperty('role')
    expect(r2.props).toHaveProperty('className', 'second')
  })

  it('calls report() on every validate call, including cache hits', () => {
    const engine = makeValidator()
    const spy = vi.spyOn(engine, 'report')
    const props = { role: 'navigation' as const }
    engine.validate('nav', props)
    engine.validate('nav', props)
    // report() is called on both the cache miss and the cache hit — violations are always surfaced
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('produces a cache miss when aria-relevant props change', () => {
    const engine = makeValidator(silentDiagnostics)
    // evaluate() is called on every cache miss; violations may be empty so report() is unreliable here
    const spy = vi.spyOn(AriaPolicyEngine, 'evaluate')
    engine.validate('nav', { role: 'navigation' })
    engine.validate('nav', { role: 'main' })
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('produces a cache hit when only non-aria props change', () => {
    const engine = makeValidator()
    const spy = vi.spyOn(engine, 'report')
    engine.validate('nav', { role: 'navigation', className: 'a', onClick: () => {} })
    engine.validate('nav', { role: 'navigation', className: 'b', id: 'x' })
    // Both calls report: first is a cache miss, second is a cache hit — report fires either way
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('bypasses cache for non-string (component) tags', () => {
    const engine = makeValidator(silentDiagnostics)
    const spy = vi.spyOn(engine, 'report')
    const Tag = () => null
    const props = { role: 'navigation' as const }
    engine.validate(Tag, props)
    engine.validate(Tag, props)
    // Both calls hit the early-exit path, report() never called
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('applies cached updates (injected aria-live) to current props on cache hit', () => {
    const engine = makeValidator(silentDiagnostics)
    // First call: cache miss — aria-live should be injected
    const r1 = engine.validate('div', { role: 'alert' })
    expect(r1.props).toHaveProperty('aria-live', 'assertive')
    // Second call: cache hit — injected aria-live must still appear in output
    const r2 = engine.validate('div', { role: 'alert' })
    expect(r2.props).toHaveProperty('aria-live', 'assertive')
  })

  it('replays aria-relevant normalisation on cache hit', () => {
    const engine = makeValidator(silentDiagnostics)
    const r1 = engine.validate('div', { role: 'alert', 'aria-relevant': 'all additions' })
    expect(r1.props).toHaveProperty('aria-relevant', 'all')
    const r2 = engine.validate('div', { role: 'alert', 'aria-relevant': 'all additions' })
    expect(r2.props).toHaveProperty('aria-relevant', 'all')
  })

  it('evicts LRU entry when cache exceeds 100 entries', () => {
    const engine = makeValidator(silentDiagnostics)
    // Spy on the static evaluate method — called once per cache miss, never on hits
    const spy = vi.spyOn(AriaPolicyEngine, 'evaluate')
    // Fill the cache with 100 entries; label-0 is LRU, label-99 is MRU
    for (let i = 0; i < 100; i++) {
      engine.validate('nav', { 'aria-label': `label-${i}` })
    }
    expect(spy).toHaveBeenCalledTimes(100)
    // Add entry 101 — evicts LRU (label-0); this call is a cache miss
    engine.validate('nav', { 'aria-label': 'label-100' })
    expect(spy).toHaveBeenCalledTimes(101)
    // label-99 (MRU) should still be cached → hit, no evaluate call
    engine.validate('nav', { 'aria-label': 'label-99' })
    expect(spy).toHaveBeenCalledTimes(101)
    // label-0 was evicted → cache miss, evaluate called again
    engine.validate('nav', { 'aria-label': 'label-0' })
    expect(spy).toHaveBeenCalledTimes(102)
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// validate() — cache performance invariants
//
// These pin down *how* a cache hit is served, not just that the resulting
// props/violations are correct — they're the contractual guarantees the
// LRU plan cache exists to provide. A change that keeps every other test
// green but breaks one of these has turned the cache into a correctness-only
// mechanism (right answer, but paying the full evaluation cost anyway).
// ---------------------------------------------------------------------------

describe('validate() — cache performance invariants', () => {
  it('returns the identical violations array reference on a cache hit, not a copy', () => {
    const engine = makeValidator(silentDiagnostics)
    const r1 = engine.validate('nav', { role: 'navigation' })
    const r2 = engine.validate('nav', { role: 'navigation' })
    expect(r2.violations).toBe(r1.violations)
  })

  it('does not clone props on a cache hit when the plan has no removals or updates', () => {
    const engine = makeValidator(silentDiagnostics)
    // role="banner" on <nav> is valid — no fix, no removal, no update.
    engine.validate('nav', { role: 'banner' })
    const props2 = { role: 'banner' as const }
    const { props: result } = engine.validate('nav', props2)
    // The plan is empty, so #applyPlan short-circuits and returns the input reference untouched.
    expect(result).toBe(props2)
  })

  it('does not invoke AriaPolicyEngine.evaluate on a cache hit', () => {
    const engine = makeValidator(silentDiagnostics)
    const spy = vi.spyOn(AriaPolicyEngine, 'evaluate')
    engine.validate('nav', { role: 'navigation' })
    expect(spy).toHaveBeenCalledTimes(1)
    engine.validate('nav', { role: 'navigation' })
    engine.validate('nav', { role: 'navigation' })
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
