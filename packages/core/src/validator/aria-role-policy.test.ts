import { describe, expect, it } from 'vitest'
import { ariaRolePolicy } from './aria-role-policy'

describe('ariaRolePolicy.getImplicitRole', () => {
  it.each([
    ['article', 'article'],
    ['aside', 'complementary'],
    ['footer', 'contentinfo'],
    ['header', 'banner'],
    ['main', 'main'],
    ['nav', 'navigation'],
  ] as const)('returns %s for <%s>', (tag, role) => {
    expect(ariaRolePolicy.getImplicitRole(tag)).toBe(role)
  })

  it('returns null for elements with no implicit role', () => {
    expect(ariaRolePolicy.getImplicitRole('div')).toBeNull()
    expect(ariaRolePolicy.getImplicitRole('span')).toBeNull()
    expect(ariaRolePolicy.getImplicitRole('button')).toBeNull()
  })
})

describe('ariaRolePolicy.isStrongImplicitRole', () => {
  it.each(['aside', 'footer', 'header', 'main', 'nav'] as const)('returns true for <%s>', (tag) => {
    expect(ariaRolePolicy.isStrongImplicitRole(tag)).toBe(true)
  })

  it('returns false for article (non-strong implicit role)', () => {
    expect(ariaRolePolicy.isStrongImplicitRole('article')).toBe(false)
  })

  it('returns false for elements with no implicit role', () => {
    expect(ariaRolePolicy.isStrongImplicitRole('div')).toBe(false)
  })
})

describe('ariaRolePolicy.isStandalone', () => {
  it('returns true for article', () => {
    expect(ariaRolePolicy.isStandalone('article')).toBe(true)
  })

  it('returns false for non-standalone elements', () => {
    expect(ariaRolePolicy.isStandalone('nav')).toBe(false)
    expect(ariaRolePolicy.isStandalone('div')).toBe(false)
    expect(ariaRolePolicy.isStandalone('main')).toBe(false)
  })
})
