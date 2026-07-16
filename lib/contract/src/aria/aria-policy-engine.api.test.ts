import { describe, expect, it } from 'vitest'

import { AriaPolicyEngine, isInvalid } from './polymorphic-validator'
import { makeCollecting, makeValidator } from './aria-policy-engine.helpers'
import { throwDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// isInvalid()
// ---------------------------------------------------------------------------

describe('isInvalid()', () => {
  it('returns true for an invalid result', () => {
    expect(isInvalid({ valid: false, severity: 'error', message: 'bad', fixable: false })).toBe(
      true,
    )
  })

  it('returns false for a valid result', () => {
    expect(isInvalid({ valid: true })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// AriaPolicyEngine.evaluate() — static, no side effects
// ---------------------------------------------------------------------------

describe('AriaPolicyEngine.evaluate() — static', () => {
  it('returns the same shape as validate() without calling report()', () => {
    const result = AriaPolicyEngine.evaluate('nav', { role: 'navigation' })
    expect(result).toHaveProperty('props')
    expect(result).toHaveProperty('violations')
  })

  it('does not report even when there is a violation', () => {
    const { reporter, engine: _ } = makeCollecting()
    AriaPolicyEngine.evaluate('nav', { role: 'navigation' })
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('strips the invalid role and returns it in violations', () => {
    const { props, violations } = AriaPolicyEngine.evaluate('nav', { role: 'navigation' })
    expect(props).not.toHaveProperty('role')
    expect(violations).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// report()
// ---------------------------------------------------------------------------

describe('report()', () => {
  it('reports a warning-severity violation', () => {
    const { reporter, engine } = makeCollecting()
    engine.report([
      {
        message: 'a warning',
        tag: 'nav',
        role: 'navigation',
        attribute: undefined,
        severity: 'warning',
        phase: 'evaluate',
      },
    ])
    expect(reporter.diagnostics).toHaveLength(1)
    expect(reporter.diagnostics[0]!.message).toBe('a warning')
  })

  it('throws for error-severity violations when strict is "throw"', () => {
    const v = makeValidator(throwDiagnostics)
    expect(() =>
      v.report([
        {
          message: 'an error',
          tag: 'nav',
          role: 'region',
          attribute: undefined,
          severity: 'error',
          phase: 'evaluate',
        },
      ]),
    ).toThrow('an error')
  })

  it('is silent for all violations when strict is false', () => {
    const v = makeValidator(silentDiagnostics)
    expect(() =>
      v.report([
        {
          message: 'w',
          tag: 'nav',
          role: 'navigation',
          attribute: undefined,
          severity: 'warning',
          phase: 'evaluate',
        },
        {
          message: 'e',
          tag: 'nav',
          role: 'region',
          attribute: undefined,
          severity: 'error',
          phase: 'evaluate',
        },
      ]),
    ).not.toThrow()
    // false-mode policy ignores all — verified by strict-compat tests
  })

  it('does not throw for error-severity violations when strict is "warn"', () => {
    const { engine } = makeCollecting()
    expect(() =>
      engine.report([
        {
          message: 'e',
          tag: 'nav',
          role: 'region',
          attribute: undefined,
          severity: 'error',
          phase: 'evaluate',
        },
      ]),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — component element types (non-string tag)
// ---------------------------------------------------------------------------

describe('validate() — unknown string tags', () => {
  it('returns props unchanged for a custom element with no implicit role', () => {
    const v = makeValidator(throwDiagnostics)
    const props = { role: 'navigation' as const, className: 'foo' }
    expect(v.validate('my-custom-element', props).props).toBe(props)
  })

  it('returns props unchanged for an arbitrary unknown tag', () => {
    const v = makeValidator(throwDiagnostics)
    const props = { role: 'navigation' }
    expect(v.validate('x-widget', props).props).toBe(props)
  })
})

// ---------------------------------------------------------------------------
// validate() — tags with no implicit role
// ---------------------------------------------------------------------------

describe('validate() — tags with no implicit role', () => {
  it('returns props unchanged for div + any role', () => {
    const v = makeValidator(throwDiagnostics)
    const props = { role: 'region' as const }
    expect(v.validate('div', props).props).toEqual(props)
  })

  it('returns props unchanged for span + any non-live-region role', () => {
    const v = makeValidator(throwDiagnostics)
    const props = { role: 'dialog' as const }
    expect(v.validate('span', props).props).toEqual(props)
  })

  it('returns props unchanged when no role prop is set', () => {
    const v = makeValidator(throwDiagnostics)
    const props = { className: 'foo' }
    expect(v.validate('nav', props).props).toEqual(props)
  })
})

// ---------------------------------------------------------------------------
// validate() — props reference equality when no fix is applied
// ---------------------------------------------------------------------------

describe('validate() — props identity when no changes occur', () => {
  it('returns the same props object reference when no violation fires', () => {
    const props = { className: 'foo' }
    const { props: result } = makeValidator(throwDiagnostics).validate('nav', props)
    expect(result).toBe(props)
  })

  it('returns the same props reference when explicit role has no violations', () => {
    // Global aria-* attrs are always valid — no fix applied, same reference returned.
    const props = { role: 'dialog', 'aria-label': 'My dialog' }
    const { props: result } = makeValidator(throwDiagnostics).validate('div', props)
    expect(result).toBe(props)
  })

  it('returns a new object when a fix is applied', () => {
    const { engine } = makeCollecting()
    const props = { role: 'navigation' }
    const { props: result } = engine.validate('nav', props)
    expect(result).not.toBe(props)
  })
})

// ---------------------------------------------------------------------------
// validate() — violation message content
// ---------------------------------------------------------------------------

describe('validate() — violation message content', () => {
  it('attribute violation message names the attribute and the effective role', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
    })
    expect(violations[0]?.message).toMatch(/aria-checked/)
    expect(violations[0]?.message).toMatch(/button/)
  })

  it('attribute violation message on implicit role names the implicit role', () => {
    const { violations } = makeCollecting().engine.validate('button', { 'aria-checked': 'true' })
    expect(violations[0]?.message).toMatch(/button/)
  })
})
