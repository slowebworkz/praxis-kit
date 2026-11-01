import { describe, it, expect } from 'vitest'
import type { ConformanceAdapter, ConformanceComponent } from './types'
import { expectClassNames, silentCreate } from './helpers'

/**
 * Isolation conformance suite.
 *
 * Verifies that two components created from the same factory are fully
 * independent — variant pipelines, ARIA engines, filterProps, and strict
 * mode are per-factory closures with no shared mutable state.
 *
 * These tests catch accidental module-level singletons, static fields, or
 * mutated shared references that would cause one component's configuration
 * to bleed into another.
 */
export function conformanceIsolationSuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  const caps = { domPropFiltering: true, ...adapter.capabilities }
  // These cases only inspect rendered output, so diagnostics are silenced throughout.
  const create = silentCreate(adapter)

  describe('conformance — component isolation', () => {
    // ── Independent class pipelines ───────────────────────────────────────────

    it('two components with different base classes render independently', () => {
      const Box = create({ styling: { base: 'box-base' } })
      const Button = create({ styling: { base: 'btn-base' } })

      const boxEl = adapter.render(Box).element
      const btnEl = adapter.render(Button).element

      expectClassNames(boxEl.className, { has: ['box-base'], lacks: ['btn-base'] })
      expectClassNames(btnEl.className, { has: ['btn-base'], lacks: ['box-base'] })
    })

    it('variant definitions on one component do not affect another', () => {
      const Box = create({ styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } } })
      const Button = create({
        styling: { variants: { intent: { primary: 'bg-blue', ghost: 'bg-transparent' } } },
      })

      const boxEl = adapter.render(Box, { size: 'lg' }).element
      const btnEl = adapter.render(Button, { intent: 'primary' }).element

      expectClassNames(boxEl.className, { has: ['text-lg'], lacks: ['bg-blue'] })
      expectClassNames(btnEl.className, { has: ['bg-blue'], lacks: ['text-lg'] })
    })

    it('default variants on one component do not apply to another', () => {
      const Box = create({
        styling: {
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
          defaults: { size: 'lg' },
        },
      })
      const Button = create({ styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } } })

      // Render Box twice to warm any default cache, then render Button fresh.
      adapter.render(Box)
      adapter.render(Box)
      const btnEl = adapter.render(Button).element

      // Box has a default; Button does not — no default must leak.
      expectClassNames(btnEl.className, { lacks: ['text-lg', 'text-sm'] })
    })

    // ── Independent filterProps ───────────────────────────────────────────────

    if (caps.domPropFiltering)
      it('filterProps on one component does not filter on another', () => {
        const Filtered = create({ filterProps: (key) => key === 'loading' })
        const Plain = create()

        const filteredEl = adapter.render(Filtered, { 'data-id': 'a', loading: 'true' }).element
        const plainEl = adapter.render(Plain, { 'data-id': 'b', loading: 'true' }).element

        // Filtered component must strip loading; Plain must keep it.
        expect(filteredEl.getAttribute('data-id')).toBe('a')
        expect(filteredEl.hasAttribute('loading')).toBe(false)
        expect(plainEl.getAttribute('data-id')).toBe('b')
        expect(plainEl.getAttribute('loading')).toBe('true')
      })

    // ── Independent naming ────────────────────────────────────────────────────

    it('displayName is independent per component', () => {
      const Box = create({ name: 'Box' })
      const Button = create({ name: 'Button' })

      expect(Box.displayName).toBe('Box')
      expect(Button.displayName).toBe('Button')
    })

    // ── Re-render isolation ───────────────────────────────────────────────────

    it('re-rendering one component does not change the other', () => {
      const Box = create({
        styling: { base: 'box', variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      })
      const Button = create({ styling: { base: 'btn' } })

      const boxResult = adapter.render(Box, { size: 'sm' })
      const btnResult = adapter.render(Button)

      const btnClassBefore = btnResult.element.className
      const btnHtmlBefore = btnResult.element.outerHTML

      boxResult.rerender({ size: 'lg' })

      expect(btnResult.element.className).toBe(btnClassBefore)
      expect(btnResult.element.outerHTML).toBe(btnHtmlBefore)
    })

    // ── Config mutation guard ─────────────────────────────────────────────────

    it('creating a component does not mutate the variants config object', () => {
      const variants = { size: { sm: 'text-sm', lg: 'text-lg' } }
      const snapshot = JSON.stringify(variants)

      create({ styling: { variants } })

      expect(JSON.stringify(variants)).toBe(snapshot)
    })
  })
}
