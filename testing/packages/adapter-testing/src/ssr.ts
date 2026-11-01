import { describe, it, expect } from 'vitest'
import type { AnyRecord } from '@praxis-kit/core'
import type {
  ConformanceComponent,
  ConformanceFactoryOptions,
  SsrConformanceAdapter,
} from './types'
import { expectContains, silentCreate } from './helpers'

export type { SsrConformanceAdapter } from './types'

// Matches the opening of an `<tag>` element, so `div` does not match `<divider>`.
const openTag = (tag: string): RegExp => new RegExp(`<${tag}[\\s>]`)

/**
 * SSR conformance suite. Verifies that components render correctly to HTML
 * strings without accessing browser globals.
 *
 * Run in a `// @vitest-environment node` test file.
 */
export function ssrConformanceSuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: SsrConformanceAdapter<C>,
): void {
  const caps = { tagPolymorphism: true, compose: true, ...adapter.capabilities }

  // These cases only inspect the HTML, so diagnostics are silenced throughout.
  const create = silentCreate(adapter)

  // Create a component from `options` and render it to HTML (sync and async renderers alike).
  const renderHtml = async (options: ConformanceFactoryOptions = {}, props?: AnyRecord) =>
    adapter.renderToString(create(options), props)

  // ── basic rendering ─────────────────────────────────────────────────────────

  describe('ssr — basic rendering', () => {
    it('renders without accessing browser globals', async () => {
      const result = adapter.renderToString(create())
      // Works for both sync (string) and async (Promise<string>) renderers.
      await expect(Promise.resolve(result)).resolves.not.toThrow()
    })

    it('renders default tag (div) to HTML', async () => {
      expect(await renderHtml()).toMatch(openTag('div'))
    })

    it('respects a custom tag option', async () => {
      expect(await renderHtml({ tag: 'nav' })).toMatch(openTag('nav'))
    })

    if (caps.tagPolymorphism)
      it('as prop overrides the default tag', async () => {
        const html = await renderHtml({}, { as: 'section' })
        expect(html).toMatch(openTag('section'))
        expect(html).not.toMatch(openTag('div'))
      })
  })

  // ── class output ─────────────────────────────────────────────────────────────

  describe('ssr — class output', () => {
    it('applies base class', async () => {
      expectContains(await renderHtml({ styling: { base: 'box-base' } }), { has: ['box-base'] })
    })

    it('applies variant class from default', async () => {
      const html = await renderHtml({
        styling: {
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
          defaults: { size: 'lg' },
        },
      })
      expectContains(html, { has: ['text-lg'] })
    })

    it('applies variant class from prop', async () => {
      const html = await renderHtml(
        { styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } } },
        { size: 'sm' },
      )
      expectContains(html, { has: ['text-sm'] })
    })

    it('merges caller class with base', async () => {
      const html = await renderHtml({ styling: { base: 'base' } }, { class: 'extra' })
      expectContains(html, { has: ['base', 'extra'] })
    })

    it('applies compound variant class', async () => {
      const html = await renderHtml(
        {
          styling: {
            base: 'btn',
            variants: {
              size: { sm: 'btn-sm', lg: 'btn-lg' },
              intent: { primary: 'btn-primary', ghost: 'btn-ghost' },
            },
            compounds: [{ size: 'lg', intent: 'ghost', class: 'btn-lg-ghost' }],
          },
        },
        { size: 'lg', intent: 'ghost' },
      )
      const classAttr = html.match(/class="([^"]*)"/)?.[1] ?? ''
      expect(classAttr.split(' ')).toContain('btn-lg-ghost')
    })
  })

  // ── compose ───────────────────────────────────────────────────────────────────

  if (caps.compose)
    describe('ssr — compose', () => {
      it('renders through "with" on the server, composing classes the same way asChild does', async () => {
        const BoxA = create({ styling: { base: 'class-a' } })
        const BoxB = create({
          tag: 'button',
          compose: { with: BoxA },
          styling: { base: 'class-b' },
        })
        const html = await adapter.renderToString(BoxB)
        expect(html).toMatch(openTag('button'))
        expectContains(html, { has: ['class-a', 'class-b'] })
      })

      if (caps.tagPolymorphism)
        it("when both components declare a tag, the composing component's own tag wins", async () => {
          const BoxA = create({ tag: 'nav' })
          const BoxB = create({ tag: 'button', compose: { with: BoxA } })
          const html = await adapter.renderToString(BoxB)
          expect(html).toMatch(openTag('button'))
          expect(html).not.toMatch(openTag('nav'))
        })
    })

  // ── prop forwarding ───────────────────────────────────────────────────────────

  describe('ssr — prop forwarding', () => {
    it('forwards data attributes', async () => {
      expectContains(await renderHtml({}, { 'data-testid': 'box' }), {
        has: ['data-testid="box"'],
      })
    })

    it('forwards aria-label', async () => {
      expectContains(await renderHtml({}, { 'aria-label': 'Close' }), {
        has: ['aria-label="Close"'],
      })
    })
  })

  // ── boolean attributes ────────────────────────────────────────────────────────

  describe('ssr — boolean attributes', () => {
    it('renders disabled on a button element', async () => {
      expect(await renderHtml({ tag: 'button' }, { disabled: true })).toMatch(/disabled/)
    })

    it('renders hidden attribute', async () => {
      expect(await renderHtml({}, { hidden: true })).toMatch(/hidden/)
    })
  })

  // ── attribute escaping ────────────────────────────────────────────────────────

  describe('ssr — attribute escaping', () => {
    it('escapes double quotes in aria-label', async () => {
      const html = await renderHtml({}, { 'aria-label': 'Hello "world"' })
      expectContains(html, { lacks: ['aria-label="Hello "world""'] })
      expect(html).toMatch(/aria-label=/)
    })

    it('does not produce a bare script element from a data attribute value', async () => {
      const html = await renderHtml({}, { 'data-value': '<b>text</b>' })
      // The value must be inside the attribute — not injected as free HTML content.
      expectContains(html, { has: ['data-value='] })
      expect(html).not.toMatch(/<b>text<\/b>(?=[^"]|$)/)
    })
  })

  // ── ARIA normalisation ────────────────────────────────────────────────────────

  describe('ssr — ARIA normalisation', () => {
    it('strips redundant role (nav has implicit role=navigation)', async () => {
      const html = await renderHtml({ tag: 'nav' }, { role: 'navigation' })
      expectContains(html, { has: ['<nav'], lacks: ['role='] })
    })

    it('forwards non-redundant role', async () => {
      expectContains(await renderHtml({}, { role: 'dialog' }), { has: ['role="dialog"'] })
    })
  })

  // ── prop normalization ordering ──────────────────────────────────────────────

  describe('ssr — prop normalization ordering', () => {
    it("a normalize option observes the HTML built-in normalizers' output", async () => {
      // `disabledProps` sets aria-disabled="true" on a disabled <button>. The
      // caller's `normalize` must run after the HTML built-ins so it can see
      // that value — the same ordering the DOM render paths use.
      const html = await renderHtml(
        {
          tag: 'button',
          normalize: (props: AnyRecord) =>
            props['aria-disabled'] === 'true' ? { ...props, 'data-observed-aria': 'yes' } : props,
        },
        { disabled: true },
      )
      expectContains(html, { has: ['data-observed-aria="yes"'] })
    })
  })
}
