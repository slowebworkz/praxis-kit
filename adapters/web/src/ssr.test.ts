// @vitest-environment node
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
