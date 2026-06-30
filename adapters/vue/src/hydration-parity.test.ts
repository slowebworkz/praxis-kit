import { describe, it, expect } from 'vitest'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { h, createSSRApp } from 'vue'
import type { Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { mount } from '@vue/test-utils'
import { hydrationParitySuite } from '@praxis-kit/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-utils/testing'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'
import { iterate } from '@praxis-kit/primitive'

function parseAttributes(html: string): Record<string, string> {
  const container = document.createElement('div')
  container.innerHTML = html
  const el = container.firstElementChild
  if (!el) return {}
  const attrs: Record<string, string> = {}
  iterate.forEach(iterate.items(el.attributes), ({ name, value }) => {
    attrs[name] = value
  })
  return attrs
}

function normalizeAttrs(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  iterate.forEachEntry(attrs, (k, v) => {
    out[k] = k === 'class' ? v.split(' ').sort().join(' ') : v
  })
  return out
}

async function ssr(comp: Component, props?: UnknownProps): Promise<string> {
  const app = createSSRApp({ render: () => h(comp, props ?? {}) })
  return renderToString(app)
}

function csr(comp: Component, props?: UnknownProps): string {
  return mount(comp, { props: props ?? {} }).element.outerHTML
}

describe('SSR/CSR hydration parity — Vue', () => {
  it('base class matches between server and client render', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-base' },
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(normalizeAttrs(parseAttributes(await ssr(Box)))).toEqual(
      normalizeAttrs(parseAttributes(csr(Box))),
    )
  })

  it('variant class matches between server and client render', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { size: { sm: 'box-sm', lg: 'box-lg' } },
        defaults: { size: 'lg' },
      },
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(normalizeAttrs(parseAttributes(await ssr(Box)))).toEqual(
      normalizeAttrs(parseAttributes(csr(Box))),
    )
  })

  it('compound variant class matches between server and client render', async () => {
    const Button = createContractComponent({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: {
          size: { sm: 'btn-sm', lg: 'btn-lg' },
          intent: { primary: 'btn-primary', ghost: 'btn-ghost' },
        },
        defaults: { size: 'sm', intent: 'primary' },
        compounds: [{ size: 'lg', intent: 'ghost', class: 'btn-lg-ghost' }],
      },
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { size: 'lg', intent: 'ghost' } as UnknownProps

    const serverAttrs = normalizeAttrs(parseAttributes(await ssr(Button, props)))
    const clientAttrs = normalizeAttrs(parseAttributes(csr(Button, props)))

    expect(serverAttrs).toEqual(clientAttrs)
    expect(serverAttrs['class']).toContain('btn-lg-ghost')
  })

  it('ARIA strip: redundant role absent on both server and client', async () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { role: 'navigation' } as UnknownProps

    const serverAttrs = parseAttributes(await ssr(Nav, props))
    const clientAttrs = parseAttributes(csr(Nav, props))

    expect(serverAttrs).not.toHaveProperty('role')
    expect(clientAttrs).not.toHaveProperty('role')
    expect(serverAttrs).toEqual(clientAttrs)
  })

  it('ARIA strip: invalid aria-* absent on both server and client', async () => {
    const Button = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { 'aria-checked': 'true' } as UnknownProps

    const serverAttrs = parseAttributes(await ssr(Button, props))
    const clientAttrs = parseAttributes(csr(Button, props))

    expect(serverAttrs).not.toHaveProperty('aria-checked')
    expect(clientAttrs).not.toHaveProperty('aria-checked')
    expect(serverAttrs).toEqual(clientAttrs)
  })

  it('as prop override: tag and attributes match between server and client', async () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { as: 'section' } as UnknownProps

    const serverHtml = await ssr(Nav, props)
    const clientHtml = csr(Nav, props)

    expect(serverHtml).toContain('<section')
    expect(clientHtml).toContain('<section')
    expect(normalizeAttrs(parseAttributes(serverHtml))).toEqual(
      normalizeAttrs(parseAttributes(clientHtml)),
    )
  })
})

hydrationParitySuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as Component & { displayName?: string },
  renderToString: (component, props = {}) =>
    renderToString(createSSRApp({ render: () => h(component, props as UnknownProps) })),
  renderToDOM: async (component, props = {}) => {
    const wrapper = mount(component as never, { props: props as never })
    return wrapper.element as HTMLElement
  },
  setup: () => {},
  cleanup: () => {},
})
