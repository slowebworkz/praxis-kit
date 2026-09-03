import { describe, expect, it } from 'vitest'
import type { IntrinsicProps } from '../types'
import { getImplicitRole } from './aria-role-policy'

describe('getImplicitRole', () => {
  it('resolves a static tag→role from the implicit-role record', () => {
    expect(getImplicitRole('nav')).toBe('navigation')
    expect(getImplicitRole('article')).toBe('article')
    expect(getImplicitRole('h1')).toBe('heading')
  })

  it('returns undefined for a tag with no implicit role', () => {
    expect(getImplicitRole('div')).toBeUndefined()
    expect(getImplicitRole('span')).toBeUndefined()
  })

  describe('input', () => {
    it('delegates to the input[type] mapping', () => {
      expect(getImplicitRole('input', { type: 'checkbox' } as IntrinsicProps)).toBe('checkbox')
      expect(getImplicitRole('input', { type: 'radio' } as IntrinsicProps)).toBe('radio')
      expect(getImplicitRole('input', { type: 'text' } as IntrinsicProps)).toBe('textbox')
    })

    it('becomes combobox for a list-eligible type with a list attribute', () => {
      expect(getImplicitRole('input', { type: 'text', list: 'opts' } as IntrinsicProps)).toBe(
        'combobox',
      )
    })

    it('returns undefined for a type with no ARIA role', () => {
      expect(getImplicitRole('input', { type: 'hidden' } as IntrinsicProps)).toBeUndefined()
      expect(getImplicitRole('input', {} as IntrinsicProps)).toBeUndefined()
    })
  })

  describe('img', () => {
    it('is role=none for a decorative image (alt="")', () => {
      expect(getImplicitRole('img', { alt: '' } as IntrinsicProps)).toBe('none')
    })

    it('is role=img when alt is present or absent', () => {
      expect(getImplicitRole('img', { alt: 'a photo' } as IntrinsicProps)).toBe('img')
      expect(getImplicitRole('img', {} as IntrinsicProps)).toBe('img')
    })
  })

  describe('section / form', () => {
    it('exposes the landmark role only when the element has an accessible name', () => {
      expect(getImplicitRole('section', {} as IntrinsicProps)).toBeUndefined()
      expect(getImplicitRole('section', { 'aria-label': 'Filters' } as IntrinsicProps)).toBe(
        'region',
      )
      expect(getImplicitRole('form', { 'aria-labelledby': 'h' } as IntrinsicProps)).toBe('form')
    })
  })
})
