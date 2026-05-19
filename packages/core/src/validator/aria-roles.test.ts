import { describe, expect, it } from 'vitest'
import { KNOWN_ARIA_ROLES, isKnownAriaRole, hasRole } from './aria-roles'

describe('isKnownAriaRole', () => {
  it('returns true for every role in KNOWN_ARIA_ROLES', () => {
    for (const role of KNOWN_ARIA_ROLES) {
      expect(isKnownAriaRole(role)).toBe(true)
    }
  })

  it('returns false for an unknown role string', () => {
    expect(isKnownAriaRole('tooltip')).toBe(false)
    expect(isKnownAriaRole('tab')).toBe(false)
    expect(isKnownAriaRole('listbox')).toBe(false)
  })

  it('returns false for non-string values', () => {
    expect(isKnownAriaRole(null)).toBe(false)
    expect(isKnownAriaRole(undefined)).toBe(false)
    expect(isKnownAriaRole(42)).toBe(false)
    expect(isKnownAriaRole({})).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isKnownAriaRole('')).toBe(false)
  })
})

describe('hasRole', () => {
  it('returns true when props.role is a string', () => {
    expect(hasRole({ role: 'button' })).toBe(true)
    expect(hasRole({ role: 'anything' })).toBe(true)
  })

  it('returns false when props.role is absent', () => {
    expect(hasRole({})).toBe(false)
  })

  it('returns false when props.role is not a string', () => {
    expect(hasRole({ role: 42 as unknown as string })).toBe(false)
    expect(hasRole({ role: null as unknown as string })).toBe(false)
  })
})
