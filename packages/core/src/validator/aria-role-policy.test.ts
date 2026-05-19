import { describe, expect, it } from 'vitest'
import { getImplicitRole, isStandaloneTag, isStrongImplicitRole } from './aria-role-policy'

describe('getImplicitRole', () => {
  it.each([
    // Landmark elements
    ['article', 'article'],
    ['aside', 'complementary'],
    ['footer', 'contentinfo'],
    ['header', 'banner'],
    ['main', 'main'],
    ['nav', 'navigation'],
    // Interactive elements
    ['button', 'button'],
    ['a', 'link'],
    ['select', 'listbox'],
    // Heading elements
    ['h1', 'heading'],
    ['h2', 'heading'],
    ['h3', 'heading'],
    ['h4', 'heading'],
    ['h5', 'heading'],
    ['h6', 'heading'],
    // List elements
    ['ul', 'list'],
    ['ol', 'list'],
    ['li', 'listitem'],
    // Table elements
    ['table', 'table'],
    ['tr', 'row'],
    ['td', 'cell'],
    ['th', 'columnheader'],
  ] as const)('<%s> → "%s"', (tag, role) => {
    expect(getImplicitRole(tag)).toBe(role)
  })

  it('returns undefined for elements with no implicit role', () => {
    expect(getImplicitRole('div')).toBeUndefined()
    expect(getImplicitRole('span')).toBeUndefined()
    expect(getImplicitRole('input')).toBeUndefined()
    expect(getImplicitRole('p')).toBeUndefined()
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
