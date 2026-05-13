import { describe, expect, it } from 'vitest'
import { getImplicitRole, isStandaloneTag, isStrongImplicitRole } from './aria-role-policy'

describe('getImplicitRole', () => {
  it.each([
    ['article', 'article'],
    ['aside', 'complementary'],
    ['footer', 'contentinfo'],
    ['header', 'banner'],
    ['main', 'main'],
    ['nav', 'navigation'],
  ] as const)('returns "%s" for <%s>', (tag, role) => {
    expect(getImplicitRole(tag)).toBe(role)
  })

  it('returns undefined for elements with no implicit role', () => {
    expect(getImplicitRole('div')).toBeUndefined()
    expect(getImplicitRole('span')).toBeUndefined()
    expect(getImplicitRole('button')).toBeUndefined()
  })
})

describe('isStrongImplicitRole', () => {
  it.each(['aside', 'footer', 'header', 'main', 'nav'] as const)('returns true for <%s>', (tag) => {
    expect(isStrongImplicitRole(tag)).toBe(true)
  })

  it('returns false for article (non-strong implicit role)', () => {
    expect(isStrongImplicitRole('article')).toBe(false)
  })

  it('returns false for elements with no implicit role', () => {
    expect(isStrongImplicitRole('div')).toBe(false)
    expect(isStrongImplicitRole('span')).toBe(false)
  })
})

describe('isStandaloneTag', () => {
  it('returns true for article', () => {
    expect(isStandaloneTag('article')).toBe(true)
  })

  it('returns false for non-standalone landmark elements', () => {
    expect(isStandaloneTag('nav')).toBe(false)
    expect(isStandaloneTag('main')).toBe(false)
    expect(isStandaloneTag('aside')).toBe(false)
  })

  it('returns false for elements with no implicit role', () => {
    expect(isStandaloneTag('div')).toBe(false)
    expect(isStandaloneTag('span')).toBe(false)
  })
})
