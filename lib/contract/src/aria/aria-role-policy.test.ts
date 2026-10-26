import { describe, expect, it } from 'vitest'
import type { IntrinsicTag } from '@praxis-kit/primitive'
import type { IntrinsicProps } from '../types'
import { getImplicitRole } from './aria-role-policy'

const STATIC_IMPLICIT_ROLE_CASES = [
  ['article', 'article'],
  ['aside', 'complementary'],
  ['footer', 'contentinfo'],
  ['header', 'banner'],
  ['main', 'main'],
  ['nav', 'navigation'],
  ['button', 'button'],
  ['textarea', 'textbox'],
  ['h1', 'heading'],
  ['h2', 'heading'],
  ['h3', 'heading'],
  ['h4', 'heading'],
  ['h5', 'heading'],
  ['h6', 'heading'],
  ['ul', 'list'],
  ['ol', 'list'],
  ['li', 'listitem'],
  ['table', 'table'],
  ['tr', 'row'],
  ['td', 'cell'],
  ['th', 'columnheader'],
  ['dialog', 'dialog'],
  ['fieldset', 'group'],
  ['figure', 'figure'],
  ['meter', 'meter'],
  ['output', 'status'],
  ['progress', 'progressbar'],
] as const satisfies readonly (readonly [IntrinsicTag, string])[]

describe('getImplicitRole', () => {
  it.each(STATIC_IMPLICIT_ROLE_CASES)(
    'maps the static implicit role for <%s> to %s',
    (tag, role) => {
      expect(getImplicitRole(tag)).toBe(role)
    },
  )

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
    })

    it('defaults an absent type to text → textbox (F3)', () => {
      expect(getImplicitRole('input', {} as IntrinsicProps)).toBe('textbox')
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
