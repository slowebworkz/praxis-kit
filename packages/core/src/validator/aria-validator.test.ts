import { describe, expect, it, vi } from 'vitest'

import { AriaPolicyEngine } from './polymorphic-validator'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidator(strict: ConstructorParameters<typeof AriaPolicyEngine>[0] = 'warn') {
  return new AriaPolicyEngine(strict)
}

// ---------------------------------------------------------------------------
// validate() — component element types (non-string tag)
// ---------------------------------------------------------------------------

describe('validate() — component element types', () => {
  it('returns props unchanged for a non-string tag', () => {
    const v = makeValidator('throw')
    const FakeComponent = () => null
    const props = { role: 'navigation' as const, className: 'foo' }
    expect(v.validate(FakeComponent, props).props).toBe(props)
  })

  it('returns props unchanged for a numeric tag', () => {
    const v = makeValidator('throw')
    const props = { role: 'navigation' }
    expect(v.validate(42, props).props).toBe(props)
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

  it('throws when strict is "throw"', () => {
    expect(() => makeValidator('throw').validate('nav', { role: 'navigation' })).toThrow()
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
