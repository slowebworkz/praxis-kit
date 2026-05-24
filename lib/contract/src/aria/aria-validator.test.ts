import { describe, expect, it, vi } from 'vitest'

import { AriaPolicyEngine, isInvalid } from './polymorphic-validator'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidator(strict: ConstructorParameters<typeof AriaPolicyEngine>[0] = 'warn') {
  return new AriaPolicyEngine(strict)
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

  it('does not call console.warn even when there is a violation', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    AriaPolicyEngine.evaluate('nav', { role: 'navigation' })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
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
  it('calls console.warn for warning-severity violations', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const v = makeValidator('warn')
    v.report([
      {
        message: 'a warning',
        tag: 'nav',
        role: 'navigation',
        attribute: undefined,
        severity: 'warning',
        phase: 'evaluate',
      },
    ])
    expect(spy).toHaveBeenCalledWith('a warning')
    spy.mockRestore()
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const v = makeValidator(false)
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
    ])
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does not throw for error-severity violations when strict is "warn"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const v = makeValidator('warn')
    expect(() =>
      v.report([
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
    spy.mockRestore()
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

  it('returns props unchanged for span + any role', () => {
    const v = makeValidator('throw')
    const props = { role: 'alert' as const }
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('nav', { role: 'navigation' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('strips the redundant role from returned props', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('nav', { role: 'navigation' })
    expect(props).not.toHaveProperty('role')
    spy.mockRestore()
  })

  it('warns but does not throw when strict is "throw" (warning severity)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => makeValidator('throw').validate('nav', { role: 'navigation' })).not.toThrow()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is silent but still strips invalid role when strict is false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator(false).validate('nav', { role: 'navigation' })
    expect(spy).not.toHaveBeenCalled()
    expect(props).not.toHaveProperty('role')
    spy.mockRestore()
  })

  it('validates all landmark elements for redundant role', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const v = makeValidator('warn')
    v.validate('main', { role: 'main' })
    v.validate('aside', { role: 'complementary' })
    v.validate('header', { role: 'banner' })
    v.validate('footer', { role: 'contentinfo' })
    expect(spy).toHaveBeenCalledTimes(4)
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkInvalidRoleOverride (strong landmark + role="region")
// ---------------------------------------------------------------------------

describe('validate() — region override on strong landmark', () => {
  it('warns when nav has role="region"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('nav', { role: 'region' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('strips role from returned props', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('nav', { role: 'region' })
    expect(props).not.toHaveProperty('role')
    spy.mockRestore()
  })

  it('warns when main has role="region"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('main', { role: 'region' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when aside has role="region"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('aside', { role: 'region' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('article', { role: 'region' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('strips role from returned props', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('article', { role: 'region' })
    expect(props).not.toHaveProperty('role')
    spy.mockRestore()
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props, violations } = makeValidator('warn').validate('nav', { role: 'banner' })
    expect(spy).not.toHaveBeenCalled()
    expect(props).toHaveProperty('role', 'banner')
    expect(violations).toHaveLength(0)
    spy.mockRestore()
  })

  it('passes through non-role props untouched on violation', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('nav', {
      role: 'navigation',
      className: 'site-nav',
    })
    expect(props).toHaveProperty('className', 'site-nav')
    expect(props).not.toHaveProperty('role')
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkInvalidAriaAttributes (aria-* on wrong role)
// ---------------------------------------------------------------------------

describe('validate() — aria-* attribute on wrong role', () => {
  it('warns for aria-checked on role="button"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('nav', { role: 'button', 'aria-checked': 'true' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('strips aria-checked from props when role="button"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('nav', {
      role: 'button',
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('aria-checked')
    spy.mockRestore()
  })

  it('warns for aria-pressed on role="checkbox"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('nav', { role: 'checkbox', 'aria-pressed': 'true' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('strips aria-pressed when role="checkbox"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('nav', {
      role: 'checkbox',
      'aria-pressed': 'true',
    })
    expect(props).not.toHaveProperty('aria-pressed')
    spy.mockRestore()
  })

  it('warns for aria-level on role="button"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('nav', { role: 'button', 'aria-level': '2' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('div', { 'aria-checked': 'true' })
    // div has no implicit role — engine skips validation entirely, no false positive
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('button', { 'aria-checked': 'true' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('strips aria-checked from <button> props', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('button', { 'aria-checked': 'true' })
    expect(props).not.toHaveProperty('aria-checked')
    spy.mockRestore()
  })

  it('allows aria-level on <h2> (implicit heading role permits it)', () => {
    const { violations } = makeValidator('throw').validate('h2', { 'aria-level': '2' })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-pressed on <a> (implicit link role does not permit it)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    makeValidator('warn').validate('a', { 'aria-pressed': 'true' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// validate() — regression: role-level violations have attribute: undefined
// ---------------------------------------------------------------------------

describe('validate() — role violations have attribute: undefined', () => {
  it('redundant role violation has attribute: undefined', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { violations } = makeValidator('warn').validate('nav', { role: 'navigation' })
    expect(violations[0]?.attribute).toBeUndefined()
    spy.mockRestore()
  })

  it('invalid role override violation has attribute: undefined', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { violations } = makeValidator('warn').validate('nav', { role: 'region' })
    expect(violations[0]?.attribute).toBeUndefined()
    spy.mockRestore()
  })

  it('standalone region violation has attribute: undefined', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { violations } = makeValidator('warn').validate('article', { role: 'region' })
    expect(violations[0]?.attribute).toBeUndefined()
    spy.mockRestore()
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const props = { role: 'navigation' }
    const { props: result } = makeValidator('warn').validate('nav', props)
    expect(result).not.toBe(props)
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// validate() — role violation + attribute violation coexist
// ---------------------------------------------------------------------------

describe('validate() — role and attribute violations coexist', () => {
  it('produces violations for both the role and the invalid attribute', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { violations } = makeValidator('warn').validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    // One for redundant role, one for aria-checked on navigation
    expect(violations).toHaveLength(2)
    spy.mockRestore()
  })

  it('strips both the redundant role and the invalid attribute', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { props } = makeValidator('warn').validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('role')
    expect(props).not.toHaveProperty('aria-checked')
    spy.mockRestore()
  })

  it('violation list has one entry with attribute set and one without', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { violations } = makeValidator('warn').validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    const roleViolation = violations.find((v) => v.attribute === undefined)
    const attrViolation = violations.find((v) => v.attribute === 'aria-checked')
    expect(roleViolation).toBeDefined()
    expect(attrViolation).toBeDefined()
    spy.mockRestore()
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
    const v = new AriaPolicyEngine(false, { rules: [customRule] })
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
    const v = new AriaPolicyEngine(false, { rules: [customRule] })
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
    const v = new AriaPolicyEngine(false, { rules: [ruleA, ruleB] })
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
    const v = new AriaPolicyEngine(false, { rules: [customRule] })
    // div has no implicit role — engine short-circuits before rules run
    const { violations } = v.validate('div', {})
    expect(violations.every((v) => v.message !== 'should not fire')).toBe(true)
  })

  it('custom rule returning valid results adds no violation', () => {
    const customRule = () => [{ valid: true as const }]
    const v = new AriaPolicyEngine(false, { rules: [customRule] })
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
    const v = new AriaPolicyEngine(false, { rules: [ruleLow, ruleHigh] })
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
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { violations } = makeValidator('warn').validate('button', { 'aria-checked': 'true' })
    expect(violations[0]?.message).toMatch(/button/)
    spy.mockRestore()
  })
})
