// @vitest-environment node
//
// Web SSR — renders to an HTML string without any DOM globals.
//
// The rendered tag always comes from options.tag, never from an `as` prop — this adapter has no
// tag polymorphism at all, on the DOM path or this SSR path. See createContractComponent's own
// doc comment for why: a custom element's tag is fixed at customElements.define() time, so
// honoring `as` here (as an earlier design did, in this adapter and Lit's) would make SSR output
// disagree with what the live client could ever actually render.

import { describe, it, expect } from 'vitest'
import { ssrConformanceSuite } from '@praxis-kit/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-utils/testing'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'
import { renderToString } from './render-to-string'

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as unknown as BareFactoryOptions) as ReturnType<
      typeof createContractComponent
    > & { displayName?: string },

  renderToString: (component, props = {}) => renderToString(component, props),

  capabilities: { tagPolymorphism: false },
})

describe('renderToString — web-specific', () => {
  it('renders opening and closing tags for empty elements', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(renderToString(Box)).toBe('<div></div>')
  })

  it('includes innerHTML in output verbatim', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(renderToString(Box, {}, '<span>hi</span>')).toContain('<span>hi</span>')
  })

  it('throws with component name for unregistered component', () => {
    expect(() =>
      renderToString(class {} as unknown as ReturnType<typeof createContractComponent>),
    ).toThrow('[renderToString]')
  })

  it('omits class attribute when no classes resolve', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(renderToString(Box)).not.toContain('class=')
  })

  it('renders resolved base class', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box' },
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(renderToString(Box)).toContain('class="box"')
  })

  it('renders resolved variant class', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(renderToString(Box, { size: 'lg' })).toContain('text-lg')
  })

  it('forwards data attributes', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(renderToString(Box, { 'data-test': 'bar', id: 'foo' })).toContain('data-test="bar"')
  })

  it('escapes double quotes in attribute values', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(Box, { title: '"quoted"' })
    expect(html).toContain('&quot;quoted&quot;')
  })

  it('escapes < in attribute values but passes innerHTML through verbatim', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(Box, { title: '<script>' }, '<em>safe</em>')
    // < is escaped in attributes; > doesn't need escaping in attribute values
    expect(html).toContain('&lt;script')
    // innerHTML is raw — callers are responsible for sanitizing untrusted content
    expect(html).toContain('<em>safe</em>')
  })
})

// ─── DOM/SSR parity — `as` ─────────────────────────────────────────────────────

describe('renderToString — `as` has no effect (matches the DOM path)', () => {
  it('ignores `as` entirely — output is identical with and without it', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'base' },
      enforcement: { diagnostics: silentDiagnostics },
    })
    const withoutAs = renderToString(Box, { 'aria-label': 'x' })
    const withAs = renderToString(Box, { 'aria-label': 'x', as: 'section' })
    expect(withAs).toBe(withoutAs)
    expect(withAs).not.toContain('<section')
  })

  it('still renders options.tag regardless of an unsupported-looking `as` value', () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(Nav, { as: 'not-a-real-tag' })
    expect(html).toMatch(/^<nav[\s>]/)
  })
})
