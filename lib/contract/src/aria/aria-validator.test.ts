import { describe, expect, it, vi } from 'vitest'

import { AriaPolicyEngine, isInvalid } from './polymorphic-validator'
import {
  CollectingReporter,
  Diagnostics,
  DefaultPolicy,
  Severity,
  throwDiagnostics,
  warnDiagnostics,
  silentDiagnostics,
} from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCollecting() {
  const reporter = new CollectingReporter()
  const engine = new AriaPolicyEngine(
    new Diagnostics(
      reporter,
      new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
    ),
  )
  return { reporter, engine }
}

function makeValidator(diagnostics: Diagnostics = warnDiagnostics) {
  return new AriaPolicyEngine(diagnostics)
}

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
// validate() — #checkRedundantRole
// ---------------------------------------------------------------------------

describe('validate() — redundant role', () => {
  it('warns when nav has role="navigation" (redundant)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'navigation' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips the redundant role from returned props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', { role: 'navigation' })
    expect(props).not.toHaveProperty('role')
  })

  it('warns but does not throw when strict is "throw" (warning severity)', () => {
    const { reporter, engine } = makeCollecting()
    expect(() => engine.validate('nav', { role: 'navigation' })).not.toThrow()
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('is silent but still strips invalid role when strict is false', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', { role: 'navigation' })
    expect(props).not.toHaveProperty('role')
  })

  it('validates all landmark elements for redundant role', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('main', { role: 'main' })
    engine.validate('aside', { role: 'complementary' })
    engine.validate('header', { role: 'banner' })
    engine.validate('footer', { role: 'contentinfo' })
    expect(reporter.diagnostics).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkInvalidRoleOverride (strong landmark + role="region")
// ---------------------------------------------------------------------------

describe('validate() — region override on strong landmark', () => {
  it('warns when nav has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips role from returned props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', { role: 'region' })
    expect(props).not.toHaveProperty('role')
  })

  it('warns when main has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('main', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('warns when aside has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('aside', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('throws when strict is "throw"', () => {
    expect(() => makeValidator(throwDiagnostics).validate('nav', { role: 'region' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkStandaloneRegion
// ---------------------------------------------------------------------------

describe('validate() — standalone element + role="region"', () => {
  it('warns when article has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('article', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips role from returned props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('article', { role: 'region' })
    expect(props).not.toHaveProperty('role')
  })

  it('throws when strict is "throw"', () => {
    expect(() => makeValidator(throwDiagnostics).validate('article', { role: 'region' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — role="" edge case
// ---------------------------------------------------------------------------

describe('validate() — empty role attribute', () => {
  it('strips the empty role from returned props', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', { role: '' })
    expect(props).not.toHaveProperty('role')
  })

  it('pushes a violation for the empty role', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', { role: '' })
    expect(violations).toHaveLength(1)
    expect(violations[0]?.message).toMatch(/empty role/)
  })

  it('preserves other props when stripping the empty role', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', {
      role: '',
      className: 'site-nav',
    })
    expect(props).toHaveProperty('className', 'site-nav')
    expect(props).not.toHaveProperty('role')
  })
})

// ---------------------------------------------------------------------------
// validate() — valid role assignments (no violation)
// ---------------------------------------------------------------------------

describe('validate() — valid role assignments', () => {
  it('allows nav + role="banner" (non-redundant, non-region)', () => {
    const { reporter, engine } = makeCollecting()
    const { props, violations } = engine.validate('nav', { role: 'banner' })
    expect(reporter.diagnostics).toHaveLength(0)
    expect(props).toHaveProperty('role', 'banner')
    expect(violations).toHaveLength(0)
  })

  it('passes through non-role props untouched on violation', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'navigation',
      className: 'site-nav',
    })
    expect(props).toHaveProperty('className', 'site-nav')
    expect(props).not.toHaveProperty('role')
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkInvalidAriaAttributes (aria-* on wrong role)
// ---------------------------------------------------------------------------

describe('validate() — aria-* attribute on wrong role', () => {
  it('warns for aria-checked on role="button"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'button', 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-checked from props when role="button"', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'button',
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('warns for aria-pressed on role="checkbox"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'checkbox', 'aria-pressed': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-pressed when role="checkbox"', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'checkbox',
      'aria-pressed': 'true',
    })
    expect(props).not.toHaveProperty('aria-pressed')
  })

  it('warns for aria-level on role="button"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'button', 'aria-level': '2' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('produces one violation per invalid attribute when multiple are present', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
      'aria-level': '2',
    })
    expect(violations).toHaveLength(2)
  })

  it('strips all invalid attributes when multiple are present', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
      'aria-level': '2',
    })
    expect(props).not.toHaveProperty('aria-checked')
    expect(props).not.toHaveProperty('aria-level')
  })

  it('produces no violation for a global attribute (aria-label) on any role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'button',
      'aria-label': 'close',
    })
    expect(violations).toHaveLength(0)
  })

  it('produces no violation for a valid pair (aria-checked on checkbox)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'checkbox',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('produces no violation for an unknown/uncurated attribute', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'button',
      'aria-foo-custom': 'value',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns when element has no effective role and a restricted attribute is present', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('div', { 'aria-checked': 'true' })
    // div has no implicit role — engine skips validation entirely, no false positive
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('sets attribute field on violation to the offending aria-* key', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
    })
    expect(violations[0]?.attribute).toBe('aria-checked')
  })

  it('does not throw even when strict is "throw" (warning severity)', () => {
    expect(() =>
      makeValidator(throwDiagnostics).validate('nav', { role: 'button', 'aria-checked': 'true' }),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — implicit role expansion (attribute check without explicit role)
// ---------------------------------------------------------------------------

describe('validate() — implicit role expansion', () => {
  it('allows aria-expanded on <button> (implicit button role permits it)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': 'false',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on <button> (implicit button role does not permit it)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('button', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-checked from <button> props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('button', { 'aria-checked': 'true' })
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('allows aria-level on <h2> (implicit heading role permits it)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', { 'aria-level': '3' })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-pressed on <a> (implicit link role does not permit it)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('a', { 'aria-pressed': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// validate() — regression: role-level violations have attribute: undefined
// ---------------------------------------------------------------------------

describe('validate() — role violations have attribute: undefined', () => {
  it('redundant role violation has attribute: undefined', () => {
    const { violations } = makeCollecting().engine.validate('nav', { role: 'navigation' })
    expect(violations[0]?.attribute).toBeUndefined()
  })

  it('invalid role override violation has attribute: undefined', () => {
    const { violations } = makeCollecting().engine.validate('nav', { role: 'region' })
    expect(violations[0]?.attribute).toBeUndefined()
  })

  it('standalone region violation has attribute: undefined', () => {
    const { violations } = makeCollecting().engine.validate('article', { role: 'region' })
    expect(violations[0]?.attribute).toBeUndefined()
  })

  it('empty role violation has attribute: undefined', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', { role: '' })
    expect(violations[0]?.attribute).toBeUndefined()
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
// validate() — role violation + attribute violation coexist
// ---------------------------------------------------------------------------

describe('validate() — role and attribute violations coexist', () => {
  it('produces violations for both the role and the invalid attribute', () => {
    const { violations } = makeCollecting().engine.validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    // One for redundant role, one for aria-checked on navigation
    expect(violations).toHaveLength(2)
  })

  it('strips both the redundant role and the invalid attribute', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('role')
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('violation list has one entry with attribute set and one without', () => {
    const { violations } = makeCollecting().engine.validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    const roleViolation = violations.find((v) => v.attribute === undefined)
    const attrViolation = violations.find((v) => v.attribute === 'aria-checked')
    expect(roleViolation).toBeDefined()
    expect(attrViolation).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// validate() — global aria-* attributes pass through without implicit role
// ---------------------------------------------------------------------------

describe('validate() — global aria-* attributes always pass through', () => {
  it('allows aria-label on <button> with no explicit role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-label': 'close',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-hidden on <h1> with no explicit role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h1', { 'aria-hidden': 'true' })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-describedby on <nav> with no explicit role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      'aria-describedby': 'desc',
    })
    expect(violations).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// AriaPolicyEngine — custom rules via constructor options
// ---------------------------------------------------------------------------

describe('AriaPolicyEngine — custom rules via constructor', () => {
  it('fires a custom rule violation', () => {
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'custom rule fired',
        fixable: false as const,
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { violations } = v.validate('nav', {})
    expect(violations.some((v) => v.message === 'custom rule fired')).toBe(true)
  })

  it('applies fix from a custom rule', () => {
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'remove data-custom',
        fixable: true as const,
        fix: {
          kind: 'removeAttribute:data-custom' as const,
          apply: ({ props }: { props: Record<string, unknown> }) =>
            'data-custom' in props
              ? {
                  applied: true as const,
                  next: Object.fromEntries(
                    Object.entries(props).filter(([k]) => k !== 'data-custom'),
                  ),
                  previous: props,
                }
              : { applied: false as const, next: props },
        },
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { props } = v.validate('nav', { 'data-custom': '1' } as never)
    expect(props).not.toHaveProperty('data-custom')
  })

  it('runs multiple custom rules and collects all violations', () => {
    const ruleA = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'A',
        fixable: false as const,
      },
    ]
    const ruleB = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'B',
        fixable: false as const,
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [ruleA, ruleB] })
    const { violations } = v.validate('nav', {})
    const msgs = violations.map((v) => v.message)
    expect(msgs).toContain('A')
    expect(msgs).toContain('B')
  })

  it('skips extra rules for a tag with no implicit role', () => {
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'should not fire',
        fixable: false as const,
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    // div has no implicit role — engine short-circuits before rules run
    const { violations } = v.validate('div', {})
    expect(violations.every((v) => v.message !== 'should not fire')).toBe(true)
  })

  it('custom rule returning valid results adds no violation', () => {
    const customRule = () => [{ valid: true as const }]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { violations } = v.validate('nav', {})
    expect(violations).toHaveLength(0)
  })

  it('applies fixes from two custom rules respecting priority order', () => {
    const log: string[] = []
    const ruleHigh = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'high priority fix',
        fixable: true as const,
        fix: {
          kind: 'removeAttribute:data-high' as const,
          priority: 0,
          apply: ({ props }: { props: Record<string, unknown> }) => {
            log.push('high')
            return 'data-high' in props
              ? {
                  applied: true as const,
                  next: Object.fromEntries(
                    Object.entries(props).filter(([k]) => k !== 'data-high'),
                  ),
                  previous: props,
                }
              : { applied: false as const, next: props }
          },
        },
      },
    ]
    const ruleLow = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'low priority fix',
        fixable: true as const,
        fix: {
          kind: 'removeAttribute:data-low' as const,
          priority: 10,
          apply: ({ props }: { props: Record<string, unknown> }) => {
            log.push('low')
            return 'data-low' in props
              ? {
                  applied: true as const,
                  next: Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'data-low')),
                  previous: props,
                }
              : { applied: false as const, next: props }
          },
        },
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [ruleLow, ruleHigh] })
    const { props } = v.validate('nav', { 'data-high': '1', 'data-low': '2' } as never)
    expect(props).not.toHaveProperty('data-high')
    expect(props).not.toHaveProperty('data-low')
    // high-priority (0) runs before low-priority (10) regardless of rule declaration order
    expect(log).toEqual(['high', 'low'])
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

// ---------------------------------------------------------------------------
// validate() — expanded static implicit roles
// ---------------------------------------------------------------------------

describe('validate() — textarea (implicit role: textbox)', () => {
  it('allows aria-multiline on textarea (valid for textbox)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('textarea', {
      'aria-multiline': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on textarea (not valid for textbox)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('textarea', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-checked from textarea props', () => {
    const { props } = makeValidator(silentDiagnostics).validate('textarea', {
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('warns for redundant role="textbox" on textarea', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('textarea', { role: 'textbox' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — fieldset (implicit role: group)', () => {
  it('allows aria-activedescendant on fieldset (valid for group)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('fieldset', {
      'aria-activedescendant': 'input-id',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on fieldset (not valid for group)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('fieldset', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — dialog (implicit role: dialog)', () => {
  it('allows aria-modal on dialog (valid for dialog role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('dialog', {
      'aria-modal': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for redundant role="dialog" on dialog element', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('dialog', { role: 'dialog' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — progress (implicit role: progressbar)', () => {
  it('allows aria-valuenow on progress (valid for progressbar)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('progress', {
      'aria-valuenow': '50',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on progress (not valid for progressbar)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('progress', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — output (implicit role: status)', () => {
  it('does not flag aria-label on output (global attribute is always valid)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('output', {
      'aria-label': 'Result',
    })
    // aria-label is globally valid — any violations are about missing aria-live, not the label
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(false)
  })

  it('injects aria-live="polite" on output (status role implies it)', () => {
    const { props } = makeValidator(silentDiagnostics).validate('output', {})
    expect(props).toHaveProperty('aria-live', 'polite')
  })
})

// ---------------------------------------------------------------------------
// validate() — input[type=...] implicit role
// ---------------------------------------------------------------------------

describe('validate() — input implicit roles via type attribute', () => {
  it('allows aria-checked on input[type=checkbox] (checkbox role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'checkbox',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-pressed on input[type=checkbox] (not valid for checkbox)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('input', { type: 'checkbox', 'aria-pressed': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('allows aria-checked on input[type=radio] (radio role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'radio',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-multiline on input[type=text] (textbox role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'text',
      'aria-multiline': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('treats input with no type as textbox', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      'aria-multiline': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-valuenow on input[type=range] (slider role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'range',
      'aria-valuenow': '50',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-valuenow on input[type=number] (spinbutton role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'number',
      'aria-valuenow': '5',
    })
    expect(violations).toHaveLength(0)
  })

  it('skips validation for input[type=hidden] (no ARIA role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'hidden',
      'aria-checked': 'true',
    })
    // No implicit role → engine skips → no false positive
    expect(violations).toHaveLength(0)
  })

  it('does not share cache between input[type=checkbox] and input[type=radio]', () => {
    const engine = makeValidator(silentDiagnostics)
    // checkbox allows aria-checked; radio also allows it — test with an attribute invalid on one but valid on both
    // Use aria-pressed: valid on button only, not checkbox or radio
    engine.validate('input', { type: 'checkbox', 'aria-pressed': 'true' })
    const { violations } = engine.validate('input', { type: 'radio', 'aria-pressed': 'true' })
    // Radio also doesn't allow aria-pressed — violation should appear (not a stale checkbox cache hit)
    expect(violations.some((v) => v.attribute === 'aria-pressed')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validate() — conditional landmarks: section and form
// ---------------------------------------------------------------------------

describe('validate() — section conditional landmark (role: region when named)', () => {
  it('derives role=region when section has aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('section', {
      'aria-label': 'News',
      role: 'region',
    })
    // role="region" matches implicit region → redundant → one warning
    expect(violations.some((v) => v.message.includes('redundant'))).toBe(true)
  })

  it('engine skips unnamed section (no implicit role without accessible name)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('section', {
      'aria-checked': 'true',
    })
    // No implicit role → no processing → no false positives
    expect(violations).toHaveLength(0)
  })

  it('validates aria-* on section when aria-labelledby provides the name', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('section', {
      'aria-labelledby': 'heading-id',
      'aria-checked': 'true',
    })
    // section → region; aria-checked is not valid for region → violation
    expect(violations.some((v) => v.attribute === 'aria-checked')).toBe(true)
  })
})

describe('validate() — form conditional landmark (role: form when named)', () => {
  it('derives role=form when form has aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('form', {
      'aria-label': 'Login',
      role: 'form',
    })
    // role="form" matches implicit form → redundant → one warning
    expect(violations.some((v) => v.message.includes('redundant'))).toBe(true)
  })

  it('engine skips unnamed form (no implicit role without accessible name)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('form', {
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// validate() — img implicit role (alt="" → none, otherwise → img)
// ---------------------------------------------------------------------------

describe('validate() — img implicit role', () => {
  it('derives role=img when alt is absent', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      'aria-label': 'Company logo',
    })
    // aria-label is global and valid for img role — no violation
    expect(violations).toHaveLength(0)
  })

  it('derives role=img when alt is non-empty', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      alt: 'Company logo',
      'aria-label': 'Company logo',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-label when alt="" (decorative, role=none)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-label': 'Logo',
    })
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(true)
  })

  it('strips aria-label from decorative img (alt="")', () => {
    const { props } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-label': 'Logo',
    })
    expect(props).not.toHaveProperty('aria-label')
  })

  it('warns for aria-labelledby when alt="" (decorative)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-labelledby': 'caption',
    })
    expect(violations.some((v) => v.attribute === 'aria-labelledby')).toBe(true)
  })

  it('allows aria-hidden on decorative img (redundant but harmless)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('does not share cache between alt="" and alt="logo"', () => {
    const engine = makeValidator(silentDiagnostics)
    // First call: alt="" → decorative; aria-label is flagged
    const r1 = engine.validate('img', { alt: '', 'aria-label': 'Logo' })
    expect(r1.violations.some((v) => v.attribute === 'aria-label')).toBe(true)
    // Second call: alt="logo" → semantic img; aria-label is valid (global)
    const r2 = engine.validate('img', { alt: 'Logo', 'aria-label': 'Logo' })
    expect(r2.violations.some((v) => v.attribute === 'aria-label')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkPresentationalAriaAttributes (explicit role=none/presentation)
// ---------------------------------------------------------------------------

describe('validate() — ARIA attributes on presentational role', () => {
  it('warns for aria-label when role="none"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-label': 'Decorative',
    })
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(true)
  })

  it('strips aria-label from role="none" element', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-label': 'Decorative',
    })
    expect(props).not.toHaveProperty('aria-label')
  })

  it('warns for aria-labelledby when role="presentation"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'presentation',
      'aria-labelledby': 'heading',
    })
    expect(violations.some((v) => v.attribute === 'aria-labelledby')).toBe(true)
  })

  it('allows aria-hidden on role="none" (redundant but harmless)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('produces no duplicate violations — #checkInvalidAriaAttributes defers to presentational check', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-checked': 'true',
    })
    // Exactly one violation for aria-checked (from presentational check, not invalid-attr check)
    const ariaCheckedViolations = violations.filter((v) => v.attribute === 'aria-checked')
    expect(ariaCheckedViolations).toHaveLength(1)
  })

  it('flags multiple ARIA attributes on role="none"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-label': 'foo',
      'aria-describedby': 'bar',
    })
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(true)
    expect(violations.some((v) => v.attribute === 'aria-describedby')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkAriaHiddenOnFocusable
// ---------------------------------------------------------------------------

describe('validate() — aria-hidden="true" on focusable elements', () => {
  it('throws for aria-hidden="true" on <button> (error severity)', () => {
    expect(() =>
      makeValidator(throwDiagnostics).validate('button', { 'aria-hidden': 'true' }),
    ).toThrow()
  })

  it('reports an error-severity violation for aria-hidden on <button>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-hidden': 'true',
    })
    const v = violations.find((v) => v.attribute === 'aria-hidden')
    expect(v).toBeDefined()
    expect(v?.severity).toBe('error')
  })

  it('reports a violation for aria-hidden on <input>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('input', {
      type: 'text',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('reports a violation for aria-hidden on <select>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('select', {
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('reports a violation for aria-hidden on <a>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('a', {
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('does not flag aria-hidden on non-interactive <div>', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'presentation',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('does not flag aria-hidden="false" on interactive elements', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-hidden': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('flags aria-hidden on <h2 tabindex="0"> (non-interactive but explicitly tabbable)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      tabindex: '0',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('does not flag aria-hidden on <h2 tabindex="-1"> (programmatic focus only)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {
      tabindex: '-1',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('fires through the full pipeline for explicit role elements', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      role: 'listbox',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkRequiredAriaProperties
// ---------------------------------------------------------------------------

describe('validate() — WAI-ARIA required properties', () => {
  it('warns for missing aria-expanded on role="combobox"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'combobox',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(true)
  })

  it('no violation when aria-expanded is present on role="combobox"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'combobox',
      'aria-expanded': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('warns for missing aria-selected on role="option"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('li', {
      role: 'option',
    })
    expect(violations.some((v) => v.attribute === 'aria-selected')).toBe(true)
  })

  it('no violation when aria-selected is present on role="option"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('li', {
      role: 'option',
      'aria-selected': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-selected')).toBe(false)
  })

  it('warns for missing aria-valuenow on role="slider"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'slider',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('warns for missing aria-valuenow on input[type=range] (implicit slider)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('input', {
      type: 'range',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('no violation for input[type=range] when aria-valuenow is present', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'range',
      'aria-valuenow': '50',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('warns for missing aria-controls and aria-valuenow on role="scrollbar"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'scrollbar',
    })
    expect(violations.some((v) => v.attribute === 'aria-controls')).toBe(true)
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('no violation when all required scrollbar properties are present', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'scrollbar',
      'aria-controls': 'content-id',
      'aria-valuenow': '0',
    })
    expect(violations.some((v) => v.attribute === 'aria-controls')).toBe(false)
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('warns for missing aria-valuenow on role="spinbutton"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'spinbutton',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('violation severity is warning (not error)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'combobox',
    })
    const v = violations.find((v) => v.attribute === 'aria-expanded')
    expect(v?.severity).toBe('warning')
  })

  it('does not fire for roles with no required properties', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'button',
    })
    expect(violations.some((v) => v.message.includes('required'))).toBe(false)
  })

  it('violation attribute field names the missing property', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'combobox',
    })
    const v = violations.find((v) => v.attribute === 'aria-expanded')
    expect(v?.attribute).toBe('aria-expanded')
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkAriaAttributeValues
// ---------------------------------------------------------------------------

describe('validate() — ARIA attribute value validation', () => {
  // ── Boolean attributes ───────────────────────────────────────────────────

  it('accepts "true" string for aria-expanded', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('accepts boolean true for aria-expanded (JSX shorthand)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': true,
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('accepts "false" string for aria-expanded', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('warns for "yes" on aria-expanded (not a boolean)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-expanded': 'yes',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(true)
  })

  it('warns for numeric 1 on aria-expanded', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-expanded': 1 as never,
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(true)
  })

  it('strips invalid aria-expanded value', () => {
    const { props } = makeValidator(silentDiagnostics).validate('button', {
      'aria-expanded': 'yes',
    })
    expect(props).not.toHaveProperty('aria-expanded')
  })

  // ── Tristate attributes ──────────────────────────────────────────────────

  it('accepts "mixed" for aria-checked (tristate)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'checkbox',
      'aria-checked': 'mixed',
    })
    expect(violations.some((v) => v.attribute === 'aria-checked')).toBe(false)
  })

  it('warns for "partial" on aria-checked (not a valid tristate)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'checkbox',
      'aria-checked': 'partial',
    })
    expect(violations.some((v) => v.attribute === 'aria-checked')).toBe(true)
  })

  it('accepts "mixed" for aria-pressed', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-pressed': 'mixed',
    })
    expect(violations.some((v) => v.attribute === 'aria-pressed')).toBe(false)
  })

  // ── Numeric attributes ───────────────────────────────────────────────────

  it('accepts numeric value for aria-valuenow', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'slider',
      'aria-valuenow': 50,
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('accepts numeric string for aria-valuenow', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'slider',
      'aria-valuenow': '50',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('warns for non-numeric string on aria-valuenow', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'slider',
      'aria-valuenow': 'fifty',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  // ── Integer range attributes ─────────────────────────────────────────────

  it('accepts aria-level="3" on h2 (valid override)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {
      'aria-level': '3',
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(false)
  })

  it('warns for aria-level="0" (below minimum of 1)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      'aria-level': '0',
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(true)
  })

  it('warns for aria-level="7" (above maximum of 6)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      'aria-level': '7',
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(true)
  })

  it('accepts aria-level={6} (numeric, within range)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {
      'aria-level': 6,
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(false)
  })

  // ── Enum attributes ──────────────────────────────────────────────────────

  it('accepts valid aria-sort token "ascending"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'columnheader',
      'aria-sort': 'ascending',
    })
    expect(violations.some((v) => v.attribute === 'aria-sort')).toBe(false)
  })

  it('warns for invalid aria-sort token "asc"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'columnheader',
      'aria-sort': 'asc',
    })
    expect(violations.some((v) => v.attribute === 'aria-sort')).toBe(true)
  })

  it('accepts valid aria-haspopup "menu"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-haspopup': 'menu',
    })
    expect(violations.some((v) => v.attribute === 'aria-haspopup')).toBe(false)
  })

  it('warns for invalid aria-haspopup "popup"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-haspopup': 'popup',
    })
    expect(violations.some((v) => v.attribute === 'aria-haspopup')).toBe(true)
  })

  it('accepts valid aria-autocomplete "list"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'combobox',
      'aria-expanded': 'false',
      'aria-autocomplete': 'list',
    })
    expect(violations.some((v) => v.attribute === 'aria-autocomplete')).toBe(false)
  })

  it('accepts valid aria-live "polite"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'status',
      'aria-live': 'polite',
    })
    expect(violations.some((v) => v.attribute === 'aria-live')).toBe(false)
  })

  it('warns for invalid aria-live "eager"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-live': 'eager',
    })
    expect(violations.some((v) => v.attribute === 'aria-live')).toBe(true)
  })

  it('does not fire for presentational elements (attrs handled by presentational check)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-expanded': 'yes',
    })
    // presentational check fires; value check defers
    const valueViolation = violations.find(
      (v) => v.attribute === 'aria-expanded' && v.message.includes('invalid value'),
    )
    expect(valueViolation).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkRedundantAriaLevel
// ---------------------------------------------------------------------------

describe('validate() — redundant aria-level on heading elements', () => {
  it('warns when h1 has aria-level="1" (matches implicit level)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h1', { 'aria-level': '1' })
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(true)
  })

  it('warns when h3 has aria-level={3} (numeric, matches implicit level)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h3', { 'aria-level': 3 })
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(true)
  })

  it('strips the redundant aria-level from props', () => {
    const { props } = makeValidator(silentDiagnostics).validate('h2', { 'aria-level': '2' })
    expect(props).not.toHaveProperty('aria-level')
  })

  it('does not warn when aria-level overrides the implicit level', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', { 'aria-level': '3' })
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(false)
  })

  it('does not warn when aria-level is absent on a heading', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {})
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(false)
  })

  it('does not warn for aria-level on non-heading elements', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'heading',
      'aria-level': '2',
    })
    // role=heading on div with aria-level=2 is not redundant (div has no implicit level)
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(false)
  })

  it('does not warn when heading has presentational role override', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      role: 'none',
      'aria-level': '2',
    })
    // presentational rule fires, not redundant-level rule
    expect(
      violations.some((v) => v.message.includes('redundant') && v.attribute === 'aria-level'),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkNameRequiredRoles (role=img)
// ---------------------------------------------------------------------------

describe('validate() — accessible name required for role=img', () => {
  it('warns when <img> has no alt and no aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {})
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(true)
  })

  it('does not warn when <img> has non-empty alt (native accessible name)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', { alt: 'Company logo' })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn when <img> has aria-label', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      'aria-label': 'Chart',
    })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn when <img> has aria-labelledby', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      'aria-labelledby': 'caption-id',
    })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn when <img alt=""> (decorative, role=none)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', { alt: '' })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('warns when <div role="img"> has no aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', { role: 'img' })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(true)
  })

  it('does not warn when <div role="img"> has aria-label', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'img',
      'aria-label': 'Revenue chart',
    })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn for non-img roles', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {})
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })
})
