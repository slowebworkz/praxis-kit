import { describe, expect, it } from 'vitest'

import { makeValidator } from './aria-policy-engine.helpers'
import { throwDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// validate() — #checkMissingLiveRegion
// ---------------------------------------------------------------------------

describe('validate() — missing aria-live on live region roles', () => {
  it('injects aria-live="assertive" for role="alert"', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', { role: 'alert' })
    expect(props).toHaveProperty('aria-live', 'assertive')
  })

  it('injects aria-live="polite" for role="status"', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', { role: 'status' })
    expect(props).toHaveProperty('aria-live', 'polite')
  })

  it('injects aria-live="polite" for role="log"', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', { role: 'log' })
    expect(props).toHaveProperty('aria-live', 'polite')
  })

  it('injects aria-live="off" for role="timer"', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', { role: 'timer' })
    expect(props).toHaveProperty('aria-live', 'off')
  })

  it('does not inject when aria-live is already present', () => {
    const { props, violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-live': 'polite',
    })
    expect(props).toHaveProperty('aria-live', 'polite')
    expect(violations.some((v) => v.message.includes('injected'))).toBe(false)
  })

  it('pushes a warning violation when injecting', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', { role: 'alert' })
    expect(violations.some((v) => v.message.includes('aria-live'))).toBe(true)
    expect(violations.find((v) => v.message.includes('aria-live'))?.severity).toBe('warning')
  })

  it('does not fire for a non-live-region role', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', { role: 'button' })
    expect(violations.some((v) => v.message.includes('aria-live'))).toBe(false)
  })

  it('proceeds for a live-region role on a tag with no implicit role', () => {
    const { props } = makeValidator(silentDiagnostics).validate('span', { role: 'status' })
    expect(props).toHaveProperty('aria-live', 'polite')
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkMissingAtomic
// ---------------------------------------------------------------------------

describe('validate() — missing aria-atomic advisory on live region roles', () => {
  it('produces a warning when aria-atomic is absent on role="alert"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', { role: 'alert' })
    expect(violations.some((v) => v.message.includes('aria-atomic'))).toBe(true)
  })

  it('does not fire when aria-atomic is already set', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-atomic': 'true',
    })
    expect(violations.some((v) => v.message.includes('aria-atomic'))).toBe(false)
  })

  it('does not fire for non-live-region roles', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', { role: 'banner' })
    expect(violations.some((v) => v.message.includes('aria-atomic'))).toBe(false)
  })

  it('is advisory only — does not inject aria-atomic into props', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', { role: 'status' })
    expect(props).not.toHaveProperty('aria-atomic')
  })

  it('does not throw even when strict is "throw"', () => {
    expect(() => makeValidator(throwDiagnostics).validate('div', { role: 'log' })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkInvalidAriaRelevant
// ---------------------------------------------------------------------------

describe('validate() — aria-relevant validation and normalisation', () => {
  it('removes aria-relevant entirely when an invalid token is present', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-relevant': 'additions bogus',
    })
    expect(props).not.toHaveProperty('aria-relevant')
  })

  it('pushes a violation listing the invalid token', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-relevant': 'additions bogus',
    })
    const v = violations.find((v) => v.attribute === 'aria-relevant')
    expect(v).toBeDefined()
    expect(v?.message).toMatch(/bogus/)
  })

  it('normalises "all additions" to "all"', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-relevant': 'all additions',
    })
    expect(props).toHaveProperty('aria-relevant', 'all')
  })

  it('normalises "all additions text removals" to "all"', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-relevant': 'all additions text removals',
    })
    expect(props).toHaveProperty('aria-relevant', 'all')
  })

  it('does not fire for valid tokens without "all"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-relevant': 'additions text',
    })
    expect(violations.some((v) => v.attribute === 'aria-relevant')).toBe(false)
  })

  it('does not fire when aria-relevant is absent', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', { role: 'alert' })
    expect(violations.some((v) => v.attribute === 'aria-relevant')).toBe(false)
  })

  it('accepts "all" alone as valid', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-relevant': 'all',
    })
    expect(violations.some((v) => v.attribute === 'aria-relevant')).toBe(false)
  })
})
