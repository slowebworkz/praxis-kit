import { describe, it, expect } from 'vitest'
import type { ConformanceAdapter, ConformanceComponent } from './types'
import { expectClassNames, silentCreate } from './helpers'

// How many times `token` appears as a whole word in a class string.
const occurrences = (className: string, token: string): number =>
  (className.match(new RegExp(`\\b${token}\\b`, 'g')) ?? []).length

/**
 * Performance conformance suite.
 *
 * Verifies that the class pipeline is idempotent and that caches produce
 * stable, consistent output. These tests do not measure speed — they verify
 * the correctness invariants that make caching safe:
 *
 *   1. Same props → same className on repeated renders (cache hits are safe).
 *   2. Different props → different className (cache doesn't over-eagerly dedup).
 *   3. Base class is always present regardless of variant changes (base never cleared).
 *   4. Interleaved renders of two components don't cross-contaminate (no shared state).
 */
export function conformancePerformanceSuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  // These cases only inspect rendered classes, so diagnostics are silenced throughout.
  const create = silentCreate(adapter)

  // Shared by the two compound-variant cases: `size: lg` + `intent: primary` adds `compound-cls`.
  const createCompoundBox = () =>
    create({
      styling: {
        base: 'base',
        variants: {
          size: { sm: 'text-sm', lg: 'text-lg' },
          intent: { primary: 'bg-blue', ghost: 'bg-transparent' },
        },
        compounds: [{ size: 'lg', intent: 'primary', class: 'compound-cls' }],
      },
    })

  describe('conformance — deterministic class generation', () => {
    // ── Same props → stable output ──────────────────────────────────────────

    it('repeated renders with identical props produce the same className', () => {
      const Box = create({
        styling: {
          base: 'box-base',
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
          defaults: { size: 'sm' },
        },
      })

      const result = adapter.render(Box, { size: 'lg' })
      const first = result.element.className

      for (let i = 0; i < 2; i++) {
        result.rerender({ size: 'lg' })
        expect(result.element.className).toBe(first)
      }
    })

    it('repeated renders without props produce the same className', () => {
      const Box = create({
        styling: { base: 'base', variants: { size: { sm: 'text-sm' } }, defaults: { size: 'sm' } },
      })

      const result = adapter.render(Box)
      const first = result.element.className

      result.rerender()
      expect(result.element.className).toBe(first)
    })

    // ── Variant changes produce different output ──────────────────────────────

    it('different variant values produce different className', () => {
      const Box = create({ styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } } })

      const result = adapter.render(Box, { size: 'sm' })
      const small = result.element.className

      result.rerender({ size: 'lg' })
      const large = result.element.className

      expect(small).not.toBe(large)
      expectClassNames(small, { has: ['text-sm'] })
      expectClassNames(large, { has: ['text-lg'] })
    })

    // ── Base class stability ───────────────────────────────────────────────────

    it('base class is always present after multiple variant changes', () => {
      const Box = create({
        styling: {
          base: 'base-cls',
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        },
      })

      const result = adapter.render(Box, { size: 'sm' })
      expectClassNames(result.element.className, { has: ['base-cls'] })

      for (const size of ['lg', 'sm']) {
        result.rerender({ size })
        expectClassNames(result.element.className, { has: ['base-cls'] })
      }
    })

    // ── Interleaved renders don't cross-contaminate ───────────────────────────

    it('interleaved renders of two components are independent', () => {
      const Box = create({
        styling: { base: 'box', variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      })
      const Button = create({
        styling: { base: 'btn', variants: { intent: { primary: 'btn-primary' } } },
      })

      const boxResult = adapter.render(Box, { size: 'sm' })
      const btnResult = adapter.render(Button, { intent: 'primary' })

      expectClassNames(boxResult.element.className, { has: ['box', 'text-sm'] })
      expectClassNames(btnResult.element.className, { has: ['btn', 'btn-primary'] })

      boxResult.rerender({ size: 'lg' })

      // Button must be unaffected by Box re-render
      expectClassNames(btnResult.element.className, {
        has: ['btn', 'btn-primary'],
        lacks: ['text-lg'],
      })
    })

    // ── Compound variant idempotency and activation/deactivation ─────────────

    it('compound variant output is stable across repeated renders', () => {
      const Box = createCompoundBox()

      const result = adapter.render(Box, { size: 'lg', intent: 'primary' })
      const first = result.element.className
      expectClassNames(first, { has: ['compound-cls'] })

      result.rerender({ size: 'lg', intent: 'primary' })
      expect(result.element.className).toBe(first)
    })

    it('compound class appears and disappears correctly across re-renders', () => {
      const Box = createCompoundBox()

      const result = adapter.render(Box, { size: 'lg', intent: 'primary' })
      expectClassNames(result.element.className, { has: ['compound-cls'] })

      result.rerender({ size: 'lg', intent: 'ghost' })
      expectClassNames(result.element.className, { lacks: ['compound-cls'] })

      result.rerender({ size: 'lg', intent: 'primary' })
      expectClassNames(result.element.className, { has: ['compound-cls'] })
    })

    // ── Class duplication ─────────────────────────────────────────────────────

    it('repeated re-renders do not accumulate duplicate classes', () => {
      const Box = create({
        styling: {
          base: 'base',
          variants: { size: { lg: 'text-lg' } },
        },
      })

      const result = adapter.render(Box, { size: 'lg' })
      result.rerender({ size: 'lg' })
      result.rerender({ size: 'lg' })

      const cls = result.element.className
      expect(occurrences(cls, 'text-lg')).toBe(1)
      expect(occurrences(cls, 'base')).toBe(1)
    })

    // ── Multiple instances of the same component ──────────────────────────────

    it('two instances of the same component are independent', () => {
      const Box = create({
        styling: { base: 'box', variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      })

      const a = adapter.render(Box, { size: 'sm' })
      const b = adapter.render(Box, { size: 'lg' })

      expectClassNames(a.element.className, { has: ['text-sm'], lacks: ['text-lg'] })
      expectClassNames(b.element.className, { has: ['text-lg'], lacks: ['text-sm'] })

      a.rerender({ size: 'lg' })

      expectClassNames(a.element.className, { has: ['text-lg'] })
      // b must be unaffected
      expectClassNames(b.element.className, { has: ['text-lg'], lacks: ['text-sm'] })
    })

    // ── Undefined vs omitted props ────────────────────────────────────────────

    it('omitted variant prop and undefined variant prop produce the same default output', () => {
      const Box = create({
        styling: {
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
          defaults: { size: 'sm' },
        },
      })

      const withUndefined = adapter.render(Box, { size: undefined }).element.className
      const withOmitted = adapter.render(Box).element.className

      expect(withUndefined).toBe(withOmitted)
      expectClassNames(withOmitted, { has: ['text-sm'] })
    })
  })
}
