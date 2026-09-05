// @vitest-environment node
//
// Lit SSR — renders to an HTML string without any DOM globals.
//
// The rendered tag always comes from options.tag, never from an `as` prop — this adapter has no
// tag polymorphism at all (capabilities.tagPolymorphism: false, both here and in
// conformance.test.ts), on the DOM path or this SSR path. See createContractComponent's own doc
// comment for why: a custom element's tag is fixed at customElements.define() time, so honoring
// `as` here (as an earlier design did) would make SSR output disagree with what the live client
// could ever actually render.

import { describe, it, expect } from 'vitest'
import { ssrConformanceSuite } from '@praxis-kit/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-utils/testing'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'
import { renderToString } from './render-to-string'

// ─── Conformance suite ────────────────────────────────────────────────────────

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as unknown as BareFactoryOptions) as ReturnType<
      typeof createContractComponent
    > & { displayName?: string },

  renderToString: (component, props = {}) => renderToString(component, props),

  capabilities: { tagPolymorphism: false },
})

// ─── Lit-specific SSR tests ───────────────────────────────────────────────────

describe('renderToString — Lit-specific', () => {
  it('renders self-closing element when children is empty', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(Box)
    expect(html).toBe('<div></div>')
  })

  it('includes children in output', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(Box, {}, '<span>hello</span>')
    expect(html).toContain('<span>hello</span>')
  })

  it('throws if component was not created by createContractComponent', () => {
    expect(() =>
      renderToString(class {} as unknown as ReturnType<typeof createContractComponent>),
    ).toThrow('[renderToString]')
  })

  it('escapes double quotes in attribute values', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(Box, { 'aria-label': 'Say "hello"' })
    expect(html).toContain('&quot;hello&quot;')
    expect(html).not.toContain('"hello"')
  })

  it('omits class attribute when no classes resolve', () => {
    const Box = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(Box)
    expect(html).not.toContain('class=')
  })

  it('accepts HTML-native class prop as well as className', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'base' },
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(renderToString(Box, { class: 'extra' })).toContain('extra')
    expect(renderToString(Box, { className: 'extra' })).toContain('extra')
  })
})

// ─── DOM/SSR parity — `as` ─────────────────────────────────────────────────────
//
// The regression this closes: `renderToString(Box, { as: 'section' })` used to emit `<section>`,
// a tag the live client (always `<praxis-button>`-shaped, never structurally an anchor/section/
// whatever `as` named) could never itself produce. These pin the fix at the one seam SSR output
// is actually generated from — `renderToString`'s own `props` argument — so a future change can't
// quietly reintroduce a DOM/SSR divergence through that path.

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
