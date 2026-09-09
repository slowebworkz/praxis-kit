import { describe, expect, it } from 'vitest'
import { isPotentiallyFocusable } from './focusable'

describe('isPotentiallyFocusable', () => {
  describe('explicit tabindex is decisive', () => {
    it('tabindex >= 0 makes any element focusable', () => {
      expect(isPotentiallyFocusable('div', { tabindex: '0' })).toBe(true)
      expect(isPotentiallyFocusable('span', { tabindex: 3 })).toBe(true)
      expect(isPotentiallyFocusable('a', { tabindex: '0' })).toBe(true) // even with no href
    })

    it('tabindex < 0 means not focusable-for-this-check (programmatic only)', () => {
      expect(isPotentiallyFocusable('button', { tabindex: '-1' })).toBe(false)
      expect(isPotentiallyFocusable('div', { tabindex: -1 })).toBe(false)
    })

    it('ignores a non-integer tabindex and falls through to the tag rules', () => {
      expect(isPotentiallyFocusable('div', { tabindex: 'abc' })).toBe(false)
      expect(isPotentiallyFocusable('button', { tabindex: '' })).toBe(true)
    })
  })

  describe('contenteditable', () => {
    it('makes a non-interactive element focusable', () => {
      expect(isPotentiallyFocusable('div', { contenteditable: '' })).toBe(true)
      expect(isPotentiallyFocusable('div', { contenteditable: 'true' })).toBe(true)
      expect(isPotentiallyFocusable('span', { contentEditable: true })).toBe(true)
    })
  })

  describe('anchors', () => {
    it('is focusable only with an href', () => {
      expect(isPotentiallyFocusable('a', { href: '/x' })).toBe(true)
      expect(isPotentiallyFocusable('a', {})).toBe(false)
      expect(isPotentiallyFocusable('area', { href: '#' })).toBe(true)
      expect(isPotentiallyFocusable('area', {})).toBe(false)
    })
  })

  describe('form controls', () => {
    it('button / select / textarea are focusable unless disabled', () => {
      expect(isPotentiallyFocusable('button', {})).toBe(true)
      expect(isPotentiallyFocusable('select', {})).toBe(true)
      expect(isPotentiallyFocusable('textarea', {})).toBe(true)
      expect(isPotentiallyFocusable('button', { disabled: true })).toBe(false)
      expect(isPotentiallyFocusable('select', { disabled: '' })).toBe(false)
    })

    it('input is focusable unless type="hidden" or disabled', () => {
      expect(isPotentiallyFocusable('input', { type: 'text' })).toBe(true)
      expect(isPotentiallyFocusable('input', {})).toBe(true)
      expect(isPotentiallyFocusable('input', { type: 'hidden' })).toBe(false)
      expect(isPotentiallyFocusable('input', { type: 'text', disabled: true })).toBe(false)
    })
  })

  describe('explicit tabindex overrides the tag/attribute rules (both directions)', () => {
    it('<button disabled tabindex="0"> is tabbable — tabindex wins over disabled', () => {
      expect(isPotentiallyFocusable('button', { disabled: true, tabindex: '0' })).toBe(true)
    })

    it('<a href tabindex="-1"> is not tabbable — tabindex wins over href', () => {
      expect(isPotentiallyFocusable('a', { href: '/x', tabindex: '-1' })).toBe(false)
    })
  })

  it('a plain non-interactive element is not focusable', () => {
    expect(isPotentiallyFocusable('div', {})).toBe(false)
    expect(isPotentiallyFocusable('h2', {})).toBe(false)
    expect(isPotentiallyFocusable('p', {})).toBe(false)
  })
})
