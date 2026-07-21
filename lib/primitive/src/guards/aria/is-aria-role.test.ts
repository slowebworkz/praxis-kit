import { describe, it, expect } from 'vitest'
import {
  getConditionalImplicitRole,
  getInputImplicitRole,
  hasStandaloneRole,
  isStrongImplicitRole,
} from './is-aria-role'

// ── getInputImplicitRole ─────────────────────────────────────────────────────

describe('getInputImplicitRole', () => {
  it('returns undefined for a type with no defined ARIA role', () => {
    expect(getInputImplicitRole('color')).toBeUndefined()
    expect(getInputImplicitRole('date')).toBeUndefined()
    expect(getInputImplicitRole('hidden')).toBeUndefined()
  })

  it('returns undefined for a non-string type', () => {
    expect(getInputImplicitRole(undefined)).toBeUndefined()
    expect(getInputImplicitRole(42)).toBeUndefined()
  })

  it('returns the mapped role for a type with no list attribute', () => {
    expect(getInputImplicitRole('text')).toBe('textbox')
    expect(getInputImplicitRole('checkbox')).toBe('checkbox')
    expect(getInputImplicitRole('search')).toBe('searchbox')
  })

  describe('list attribute → combobox override', () => {
    it('switches text-like types to combobox when list is present', () => {
      expect(getInputImplicitRole('text', 'options')).toBe('combobox')
      expect(getInputImplicitRole('search', 'options')).toBe('combobox')
      expect(getInputImplicitRole('tel', 'options')).toBe('combobox')
      expect(getInputImplicitRole('url', 'options')).toBe('combobox')
      expect(getInputImplicitRole('email', 'options')).toBe('combobox')
    })

    it('treats an empty-string list value the same as a present one', () => {
      expect(getInputImplicitRole('text', '')).toBe('combobox')
    })

    it('does not override when list is null or undefined', () => {
      expect(getInputImplicitRole('text', undefined)).toBe('textbox')
      expect(getInputImplicitRole('text', null)).toBe('textbox')
    })

    it('does not override types outside the text-like set, even with a list', () => {
      expect(getInputImplicitRole('checkbox', 'options')).toBe('checkbox')
      expect(getInputImplicitRole('radio', 'options')).toBe('radio')
      expect(getInputImplicitRole('range', 'options')).toBe('slider')
      expect(getInputImplicitRole('number', 'options')).toBe('spinbutton')
    })

    it('does not surface combobox for a type with no implicit role, even with a list', () => {
      expect(getInputImplicitRole('color', 'options')).toBeUndefined()
      expect(getInputImplicitRole('date', 'options')).toBeUndefined()
    })
  })
})

// ── getConditionalImplicitRole ───────────────────────────────────────────────

describe('getConditionalImplicitRole', () => {
  it('returns the landmark role when a non-empty aria-label is present', () => {
    expect(getConditionalImplicitRole('section', 'News', undefined)).toBe('region')
    expect(getConditionalImplicitRole('form', 'Login', undefined)).toBe('form')
  })

  it('returns the landmark role when a non-empty aria-labelledby is present', () => {
    expect(getConditionalImplicitRole('section', undefined, 'heading-id')).toBe('region')
  })

  it('returns undefined when neither aria-label nor aria-labelledby is present', () => {
    expect(getConditionalImplicitRole('section', undefined, undefined)).toBeUndefined()
  })

  it('returns undefined for an empty-string aria-label', () => {
    expect(getConditionalImplicitRole('section', '', undefined)).toBeUndefined()
  })

  it('returns undefined for a whitespace-only aria-label', () => {
    expect(getConditionalImplicitRole('section', '   ', undefined)).toBeUndefined()
  })

  it('returns undefined for a whitespace-only aria-labelledby', () => {
    expect(getConditionalImplicitRole('section', undefined, '  \t\n ')).toBeUndefined()
  })

  it('returns undefined for a tag that has no conditional landmark role', () => {
    expect(getConditionalImplicitRole('div', 'News', undefined)).toBeUndefined()
  })
})

// ── hasStandaloneRole / isStrongImplicitRole ─────────────────────────────────

describe('hasStandaloneRole', () => {
  it('returns true for a tag with a standalone implicit role', () => {
    expect(hasStandaloneRole('article')).toBe(true)
  })

  it('returns false for a tag with no implicit role', () => {
    expect(hasStandaloneRole('div')).toBe(false)
  })

  it('returns false for a tag with a non-standalone implicit role', () => {
    expect(hasStandaloneRole('nav')).toBe(false)
  })
})

describe('isStrongImplicitRole', () => {
  it('returns true for a tag with a strong implicit role', () => {
    expect(isStrongImplicitRole('nav')).toBe(true)
  })

  it('returns false for a tag with no implicit role', () => {
    expect(isStrongImplicitRole('div')).toBe(false)
  })

  it('returns false for a tag with a non-strong implicit role', () => {
    expect(isStrongImplicitRole('article')).toBe(false)
  })
})
