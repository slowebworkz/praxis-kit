import { describe, expect, it, vi } from 'vitest'

import { diagnosticsFromStrictMode } from '../strict'
import { AriaPolicyEngine, isInvalid } from './polymorphic-validator'
import { CollectingReporter, Diagnostics, DefaultPolicy, Severity } from '@praxis-kit/diagnostics'

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

function makeValidator(strict: Parameters<typeof diagnosticsFromStrictMode>[0] = 'warn') {
  return new AriaPolicyEngine(diagnosticsFromStrictMode(strict))
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
    const v = makeValidator('throw')
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
    const v = makeValidator(false)
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
    const v = makeValidator('throw')
    const props = { role: 'navigation' as const, className: 'foo' }
    expect(v.validate('my-custom-element', props).props).toBe(props)
  })

  it('returns props unchanged for an arbitrary unknown tag', () => {
    const v = makeValidator('throw')
    const props = { role: 'navigation' }
    expect(v.validate('x-widget', props).props).toBe(props)
  })
})

// ---------------------------------------------------------------------------
// validate() — tags with no implicit role
// ---------------------------------------------------------------------------

describe('validate() — tags with no implicit role', () => {
  it('returns props unchanged for div + any role', () => {
    const v = makeValidator('throw')
    const props = { role: 'region' as const }
    expect(v.validate('div', props).props).toEqual(props)
  })

  it('returns props unchanged for span + any non-live-region role', () => {
    const v = makeValidator('throw')
    const props = { role: 'dialog' as const }
    expect(v.validate('span', props).props).toEqual(props)
  })

  it('returns props unchanged when no role prop is set', () => {
    const v = makeValidator('throw')
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
    const { props } = makeValidator(false).validate('nav', { role: 'navigation' })
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
    expect(() => makeValidator('throw').validate('nav', { role: 'region' })).toThrow()
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
    expect(() => makeValidator('throw').validate('article', { role: 'region' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — role="" edge case
// ---------------------------------------------------------------------------

describe('validate() — empty role attribute', () => {
  it('strips the empty role from returned props', () => {
    const { props } = makeValidator(false).validate('nav', { role: '' })
    expect(props).not.toHaveProperty('role')
  })

  it('pushes a violation for the empty role', () => {
    const { violations } = makeValidator(false).validate('nav', { role: '' })
    expect(violations).toHaveLength(1)
    expect(violations[0]?.message).toMatch(/empty role/)
  })

  it('preserves other props when stripping the empty role', () => {
    const { props } = makeValidator(false).validate('nav', { role: '', className: 'site-nav' })
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
    const { violations } = makeValidator(false).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
      'aria-level': '2',
    })
    expect(violations).toHaveLength(2)
  })

  it('strips all invalid attributes when multiple are present', () => {
    const { props } = makeValidator(false).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
      'aria-level': '2',
    })
    expect(props).not.toHaveProperty('aria-checked')
    expect(props).not.toHaveProperty('aria-level')
  })

  it('produces no violation for a global attribute (aria-label) on any role', () => {
    const { violations } = makeValidator('throw').validate('nav', {
      role: 'button',
      'aria-label': 'close',
    })
    expect(violations).toHaveLength(0)
  })

  it('produces no violation for a valid pair (aria-checked on checkbox)', () => {
    const { violations } = makeValidator('throw').validate('nav', {
      role: 'checkbox',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('produces no violation for an unknown/uncurated attribute', () => {
    const { violations } = makeValidator('throw').validate('nav', {
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
    const { violations } = makeValidator(false).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
    })
    expect(violations[0]?.attribute).toBe('aria-checked')
  })

  it('does not throw even when strict is "throw" (warning severity)', () => {
    expect(() =>
      makeValidator('throw').validate('nav', { role: 'button', 'aria-checked': 'true' }),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — implicit role expansion (attribute check without explicit role)
// ---------------------------------------------------------------------------

describe('validate() — implicit role expansion', () => {
  it('allows aria-expanded on <button> (implicit button role permits it)', () => {
    const { violations } = makeValidator('throw').validate('button', { 'aria-expanded': 'false' })
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
    const { violations } = makeValidator('throw').validate('h2', { 'aria-level': '2' })
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
    const { violations } = makeValidator(false).validate('nav', { role: '' })
    expect(violations[0]?.attribute).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// validate() — props reference equality when no fix is applied
// ---------------------------------------------------------------------------

describe('validate() — props identity when no changes occur', () => {
  it('returns the same props object reference when no violation fires', () => {
    const props = { className: 'foo' }
    const { props: result } = makeValidator('throw').validate('nav', props)
    expect(result).toBe(props)
  })

  it('returns the same props reference for a tag with no implicit role', () => {
    const props = { role: 'dialog', 'aria-checked': 'true' }
    const { props: result } = makeValidator('throw').validate('div', props)
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
    const { violations } = makeValidator('throw').validate('button', { 'aria-label': 'close' })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-hidden on <h1> with no explicit role', () => {
    const { violations } = makeValidator('throw').validate('h1', { 'aria-hidden': 'true' })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-describedby on <nav> with no explicit role', () => {
    const { violations } = makeValidator('throw').validate('nav', { 'aria-describedby': 'desc' })
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
    const v = new AriaPolicyEngine(diagnosticsFromStrictMode(false), { rules: [customRule] })
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
    const v = new AriaPolicyEngine(diagnosticsFromStrictMode(false), { rules: [customRule] })
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
    const v = new AriaPolicyEngine(diagnosticsFromStrictMode(false), { rules: [ruleA, ruleB] })
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
    const v = new AriaPolicyEngine(diagnosticsFromStrictMode(false), { rules: [customRule] })
    // div has no implicit role — engine short-circuits before rules run
    const { violations } = v.validate('div', {})
    expect(violations.every((v) => v.message !== 'should not fire')).toBe(true)
  })

  it('custom rule returning valid results adds no violation', () => {
    const customRule = () => [{ valid: true as const }]
    const v = new AriaPolicyEngine(diagnosticsFromStrictMode(false), { rules: [customRule] })
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
    const v = new AriaPolicyEngine(diagnosticsFromStrictMode(false), { rules: [ruleLow, ruleHigh] })
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
    const { violations } = makeValidator(false).validate('nav', {
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
    const engine = makeValidator(false)
    const r1 = engine.validate('nav', { role: 'navigation' })
    const r2 = engine.validate('nav', { role: 'navigation' })
    expect(r2.violations).toEqual(r1.violations)
  })

  it('applies cached removals to current props, not to the first call props', () => {
    const engine = makeValidator(false)
    engine.validate('nav', { role: 'navigation', className: 'first' })
    const r2 = engine.validate('nav', { role: 'navigation', className: 'second' })
    // role should be stripped (cached plan), className should be from the current call
    expect(r2.props).not.toHaveProperty('role')
    expect(r2.props).toHaveProperty('className', 'second')
  })

  it('calls report() on every validate call, including cache hits', () => {
    const engine = makeValidator('warn')
    const spy = vi.spyOn(engine, 'report')
    const props = { role: 'navigation' as const }
    engine.validate('nav', props)
    engine.validate('nav', props)
    // report() is called on both the cache miss and the cache hit — violations are always surfaced
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('produces a cache miss when aria-relevant props change', () => {
    const engine = makeValidator(false)
    // evaluate() is called on every cache miss; violations may be empty so report() is unreliable here
    const spy = vi.spyOn(AriaPolicyEngine, 'evaluate')
    engine.validate('nav', { role: 'navigation' })
    engine.validate('nav', { role: 'main' })
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('produces a cache hit when only non-aria props change', () => {
    const engine = makeValidator('warn')
    const spy = vi.spyOn(engine, 'report')
    engine.validate('nav', { role: 'navigation', className: 'a', onClick: () => {} })
    engine.validate('nav', { role: 'navigation', className: 'b', id: 'x' })
    // Both calls report: first is a cache miss, second is a cache hit — report fires either way
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('bypasses cache for non-string (component) tags', () => {
    const engine = makeValidator(false)
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
    const engine = makeValidator(false)
    // First call: cache miss — aria-live should be injected
    const r1 = engine.validate('div', { role: 'alert' })
    expect(r1.props).toHaveProperty('aria-live', 'assertive')
    // Second call: cache hit — injected aria-live must still appear in output
    const r2 = engine.validate('div', { role: 'alert' })
    expect(r2.props).toHaveProperty('aria-live', 'assertive')
  })

  it('replays aria-relevant normalisation on cache hit', () => {
    const engine = makeValidator(false)
    const r1 = engine.validate('div', { role: 'alert', 'aria-relevant': 'all additions' })
    expect(r1.props).toHaveProperty('aria-relevant', 'all')
    const r2 = engine.validate('div', { role: 'alert', 'aria-relevant': 'all additions' })
    expect(r2.props).toHaveProperty('aria-relevant', 'all')
  })

  it('evicts LRU entry when cache exceeds 100 entries', () => {
    const engine = makeValidator(false)
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
    const { props } = makeValidator(false).validate('div', { role: 'alert' })
    expect(props).toHaveProperty('aria-live', 'assertive')
  })

  it('injects aria-live="polite" for role="status"', () => {
    const { props } = makeValidator(false).validate('div', { role: 'status' })
    expect(props).toHaveProperty('aria-live', 'polite')
  })

  it('injects aria-live="polite" for role="log"', () => {
    const { props } = makeValidator(false).validate('div', { role: 'log' })
    expect(props).toHaveProperty('aria-live', 'polite')
  })

  it('injects aria-live="off" for role="timer"', () => {
    const { props } = makeValidator(false).validate('div', { role: 'timer' })
    expect(props).toHaveProperty('aria-live', 'off')
  })

  it('does not inject when aria-live is already present', () => {
    const { props, violations } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-live': 'polite',
    })
    expect(props).toHaveProperty('aria-live', 'polite')
    expect(violations.some((v) => v.message.includes('injected'))).toBe(false)
  })

  it('pushes a warning violation when injecting', () => {
    const { violations } = makeValidator(false).validate('div', { role: 'alert' })
    expect(violations.some((v) => v.message.includes('aria-live'))).toBe(true)
    expect(violations.find((v) => v.message.includes('aria-live'))?.severity).toBe('warning')
  })

  it('does not fire for a non-live-region role', () => {
    const { violations } = makeValidator(false).validate('div', { role: 'button' })
    expect(violations.some((v) => v.message.includes('aria-live'))).toBe(false)
  })

  it('proceeds for a live-region role on a tag with no implicit role', () => {
    const { props } = makeValidator(false).validate('span', { role: 'status' })
    expect(props).toHaveProperty('aria-live', 'polite')
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkMissingAtomic
// ---------------------------------------------------------------------------

describe('validate() — missing aria-atomic advisory on live region roles', () => {
  it('produces a warning when aria-atomic is absent on role="alert"', () => {
    const { violations } = makeValidator(false).validate('div', { role: 'alert' })
    expect(violations.some((v) => v.message.includes('aria-atomic'))).toBe(true)
  })

  it('does not fire when aria-atomic is already set', () => {
    const { violations } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-atomic': 'true',
    })
    expect(violations.some((v) => v.message.includes('aria-atomic'))).toBe(false)
  })

  it('does not fire for non-live-region roles', () => {
    const { violations } = makeValidator(false).validate('nav', { role: 'banner' })
    expect(violations.some((v) => v.message.includes('aria-atomic'))).toBe(false)
  })

  it('is advisory only — does not inject aria-atomic into props', () => {
    const { props } = makeValidator(false).validate('div', { role: 'status' })
    expect(props).not.toHaveProperty('aria-atomic')
  })

  it('does not throw even when strict is "throw"', () => {
    expect(() => makeValidator('throw').validate('div', { role: 'log' })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkInvalidAriaRelevant
// ---------------------------------------------------------------------------

describe('validate() — aria-relevant validation and normalisation', () => {
  it('removes aria-relevant entirely when an invalid token is present', () => {
    const { props } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-relevant': 'additions bogus',
    })
    expect(props).not.toHaveProperty('aria-relevant')
  })

  it('pushes a violation listing the invalid token', () => {
    const { violations } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-relevant': 'additions bogus',
    })
    const v = violations.find((v) => v.attribute === 'aria-relevant')
    expect(v).toBeDefined()
    expect(v?.message).toMatch(/bogus/)
  })

  it('normalises "all additions" to "all"', () => {
    const { props } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-relevant': 'all additions',
    })
    expect(props).toHaveProperty('aria-relevant', 'all')
  })

  it('normalises "all additions text removals" to "all"', () => {
    const { props } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-relevant': 'all additions text removals',
    })
    expect(props).toHaveProperty('aria-relevant', 'all')
  })

  it('does not fire for valid tokens without "all"', () => {
    const { violations } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-relevant': 'additions text',
    })
    expect(violations.some((v) => v.attribute === 'aria-relevant')).toBe(false)
  })

  it('does not fire when aria-relevant is absent', () => {
    const { violations } = makeValidator(false).validate('div', { role: 'alert' })
    expect(violations.some((v) => v.attribute === 'aria-relevant')).toBe(false)
  })

  it('accepts "all" alone as valid', () => {
    const { violations } = makeValidator(false).validate('div', {
      role: 'alert',
      'aria-relevant': 'all',
    })
    expect(violations.some((v) => v.attribute === 'aria-relevant')).toBe(false)
  })
})
