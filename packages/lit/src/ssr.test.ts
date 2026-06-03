// @vitest-environment node
//
// Lit SSR — renders to an HTML string without any DOM globals.
//
// Unlike the DOM adapter, renderToString resolves the HTML tag directly from
// the praxis-ui runtime so tag polymorphism (as prop, options.tag) works
// correctly in server-rendered output.

import { describe, it, expect } from 'vitest'
import { ssrConformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-ui/adapter-utils/testing'
import { createContractComponent } from './create-contract-component'
import { renderToString } from './render-to-string'

// ─── Conformance suite ────────────────────────────────────────────────────────

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as unknown as BareFactoryOptions) as ReturnType<
      typeof createContractComponent
    > & { displayName?: string },

  renderToString: (component, props = {}) => renderToString(component, props),
})

// ─── Lit-specific SSR tests ───────────────────────────────────────────────────

describe('renderToString — Lit-specific', () => {
  it('renders self-closing element when children is empty', () => {
    const Box = createContractComponent({ tag: 'div', enforcement: { strict: false } })
    const html = renderToString(Box)
    expect(html).toBe('<div></div>')
  })

  it('includes children in output', () => {
    const Box = createContractComponent({ tag: 'div', enforcement: { strict: false } })
    const html = renderToString(Box, {}, '<span>hello</span>')
    expect(html).toContain('<span>hello</span>')
  })

  it('throws if component was not created by createContractComponent', () => {
    expect(() =>
      renderToString(class {} as unknown as ReturnType<typeof createContractComponent>),
    ).toThrow('[renderToString]')
  })

  it('escapes double quotes in attribute values', () => {
    const Box = createContractComponent({ tag: 'div', enforcement: { strict: false } })
    const html = renderToString(Box, { 'aria-label': 'Say "hello"' })
    expect(html).toContain('&quot;hello&quot;')
    expect(html).not.toContain('"hello"')
  })

  it('omits class attribute when no classes resolve', () => {
    const Box = createContractComponent({ tag: 'div', enforcement: { strict: false } })
    const html = renderToString(Box)
    expect(html).not.toContain('class=')
  })

  it('accepts HTML-native class prop as well as className', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'base' },
      enforcement: { strict: false },
    })
    expect(renderToString(Box, { class: 'extra' })).toContain('extra')
    expect(renderToString(Box, { className: 'extra' })).toContain('extra')
  })
})
