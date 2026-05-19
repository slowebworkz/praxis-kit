import { describe, expect, it } from 'vitest'

import { isAriaAttributeValidForRole, isGlobalAriaAttribute } from './aria-attribute-policy'

describe('isGlobalAriaAttribute', () => {
  it.each([
    'aria-atomic',
    'aria-busy',
    'aria-controls',
    'aria-current',
    'aria-describedby',
    'aria-details',
    'aria-disabled',
    'aria-dropeffect',
    'aria-errormessage',
    'aria-flowto',
    'aria-grabbed',
    'aria-hidden',
    'aria-keyshortcuts',
    'aria-label',
    'aria-labelledby',
    'aria-live',
    'aria-owns',
    'aria-posinset',
    'aria-relevant',
    'aria-roledescription',
    'aria-setsize',
  ])('returns true for %s', (attr) => {
    expect(isGlobalAriaAttribute(attr)).toBe(true)
  })

  it.each(['aria-checked', 'aria-pressed', 'aria-expanded', 'aria-level', 'aria-sort'])(
    'returns false for restricted attribute %s',
    (attr) => {
      expect(isGlobalAriaAttribute(attr)).toBe(false)
    },
  )

  it('returns false for an unknown attribute', () => {
    expect(isGlobalAriaAttribute('aria-foo-custom')).toBe(false)
  })
})

describe('isAriaAttributeValidForRole', () => {
  it('returns true for a valid attr/role pair', () => {
    expect(isAriaAttributeValidForRole('aria-checked', 'checkbox')).toBe(true)
  })

  it('returns true for all roles that permit aria-checked', () => {
    for (const role of ['checkbox', 'menuitemcheckbox', 'option', 'radio', 'switch', 'treeitem']) {
      expect(isAriaAttributeValidForRole('aria-checked', role)).toBe(true)
    }
  })

  it('returns false for an invalid attr/role pair', () => {
    expect(isAriaAttributeValidForRole('aria-checked', 'button')).toBe(false)
  })

  it('returns false when role is undefined and attr is restricted', () => {
    expect(isAriaAttributeValidForRole('aria-pressed', undefined)).toBe(false)
  })

  it('returns true for an uncurated attribute regardless of role', () => {
    expect(isAriaAttributeValidForRole('aria-foo-custom', 'button')).toBe(true)
    expect(isAriaAttributeValidForRole('aria-foo-custom', undefined)).toBe(true)
  })

  it('returns true for aria-expanded on button (key implicit-role case)', () => {
    expect(isAriaAttributeValidForRole('aria-expanded', 'button')).toBe(true)
  })

  it('returns false for aria-sort on a non-header role', () => {
    expect(isAriaAttributeValidForRole('aria-sort', 'row')).toBe(false)
  })

  it('returns true for aria-level on heading', () => {
    expect(isAriaAttributeValidForRole('aria-level', 'heading')).toBe(true)
  })

  it('returns false for aria-multiline on button', () => {
    expect(isAriaAttributeValidForRole('aria-multiline', 'button')).toBe(false)
  })
})
