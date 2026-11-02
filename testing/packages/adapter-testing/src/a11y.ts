import { describe, it, expect } from 'vitest'
import type { AnyRecord } from '@praxis-kit/core'
import type { ConformanceAdapter, ConformanceComponent, ConformanceFactoryOptions } from './types'

/**
 * A11y conformance suite for framework adapters.
 *
 * Tests keyboard event forwarding, tabIndex, focusability, focus/blur event
 * propagation, disabled state, interactive ARIA attributes, and keyboard
 * activation patterns. Run in a jsdom environment alongside conformanceSuite.
 */
export function conformanceA11ySuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  const mount = (props: AnyRecord, options: ConformanceFactoryOptions = {}) =>
    adapter.render(adapter.createComponent(options), props)

  const press = (element: HTMLElement, key: string, type: 'keydown' | 'keyup' = 'keydown') =>
    element.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }))

  // ── tabIndex ────────────────────────────────────────────────────────────────

  describe('a11y — tabIndex', () => {
    it.each([0, -1])('forwards tabIndex={%i} to the DOM element', (tabIndex) => {
      const { element } = mount({ tabIndex })
      expect(element.getAttribute('tabindex')).toBe(String(tabIndex))
    })

    it('element with tabIndex={0} is focusable', () => {
      const { element } = mount({ tabIndex: 0 })
      element.focus()
      expect(document.activeElement).toBe(element)
    })
  })

  // ── focus / blur events ─────────────────────────────────────────────────────

  describe('a11y — focus and blur events', () => {
    it('fires onFocus handler when element receives focus', () => {
      let called = false
      const { element } = mount({
        tabIndex: 0,
        onFocus: () => {
          called = true
        },
      })
      element.focus()
      expect(called).toBe(true)
    })

    it('fires onBlur handler on blur dispatch', () => {
      let called = false
      const { element } = mount({
        onBlur: () => {
          called = true
        },
      })
      // React/Preact compat use focusout; Vue uses native blur
      element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      element.dispatchEvent(new FocusEvent('blur'))
      expect(called).toBe(true)
    })
  })

  // ── keyboard events ─────────────────────────────────────────────────────────

  describe('a11y — keyboard events', () => {
    const cases = [
      { title: 'fires onKeyDown handler', handler: 'onKeyDown', type: 'keydown', key: 'Enter' },
      { title: 'fires onKeyUp handler', handler: 'onKeyUp', type: 'keyup', key: 'Escape' },
      { title: 'fires onKeyDown for Space key', handler: 'onKeyDown', type: 'keydown', key: ' ' },
    ] as const

    // A loop rather than `it.each('$title')`: vitest quotes interpolated strings in titles.
    for (const { title, handler, type, key } of cases) {
      it(title, () => {
        let received = ''
        const { element } = mount({
          [handler]: (e: KeyboardEvent) => {
            received = e.key
          },
        })
        press(element, key, type)
        expect(received).toBe(key)
      })
    }
  })

  // ── keyboard activation ─────────────────────────────────────────────────────

  describe('a11y — keyboard activation patterns', () => {
    for (const { label, key } of [
      { label: 'Enter', key: 'Enter' },
      { label: 'Space', key: ' ' },
    ]) {
      it(`role=button element activates on ${label} key`, () => {
        let activated = false
        const { element } = mount({
          role: 'button',
          tabIndex: 0,
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === key) activated = true
          },
        })
        press(element, key)
        expect(activated).toBe(true)
      })
    }
  })

  // ── disabled state ──────────────────────────────────────────────────────────

  describe('a11y — disabled state', () => {
    it('forwards disabled attribute on a button', () => {
      const { element } = mount({ disabled: true }, { tag: 'button' })
      expect(element.hasAttribute('disabled')).toBe(true)
    })

    it('updates disabled state on rerender', () => {
      const result = mount({ disabled: false }, { tag: 'button' })
      expect(result.element.hasAttribute('disabled')).toBe(false)
      result.rerender({ disabled: true })
      expect(result.element.hasAttribute('disabled')).toBe(true)
    })
  })

  // ── interactive ARIA attributes ─────────────────────────────────────────────

  describe('a11y — interactive ARIA attributes', () => {
    it.each([
      ['aria-expanded', 'true'],
      ['aria-pressed', 'true'],
      ['aria-controls', 'menu-id'],
      ['aria-disabled', 'true'],
      ['aria-labelledby', 'label-id'],
      ['aria-describedby', 'help-text'],
      ['aria-live', 'polite'],
    ])('forwards %s', (attribute, value) => {
      const { element } = mount({ [attribute]: value })
      expect(element.getAttribute(attribute)).toBe(value)
    })

    it('forwards role=button on a non-button element', () => {
      const { element } = mount({ role: 'button' })
      expect(element.getAttribute('role')).toBe('button')
    })

    it('updates aria-expanded on rerender', () => {
      const result = mount({ 'aria-expanded': 'false' })
      expect(result.element.getAttribute('aria-expanded')).toBe('false')
      result.rerender({ 'aria-expanded': 'true' })
      expect(result.element.getAttribute('aria-expanded')).toBe('true')
    })
  })

  // ── data attributes ─────────────────────────────────────────────────────────

  describe('a11y — data attributes', () => {
    it('forwards data-state', () => {
      const { element } = mount({ 'data-state': 'open' })
      expect(element.getAttribute('data-state')).toBe('open')
    })

    it('forwards data-disabled', () => {
      const { element } = mount({ 'data-disabled': '' })
      expect(element.hasAttribute('data-disabled')).toBe(true)
    })
  })
}
