// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { h, createSSRApp } from 'vue'
import type { Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-testing'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

async function ssr(
  comp: Component,
  props?: UnknownProps,
  children?: () => ReturnType<typeof h>,
): Promise<string> {
  const app = createSSRApp({
    render: () => h(comp, props ?? {}, children ? { default: children } : undefined),
  })
  return renderToString(app)
}

describe('createContractComponent — SSR (@vue/server-renderer)', () => {
  it('strips invalid aria-* attribute — server HTML agrees with what client hydration would produce', async () => {
    // aria-checked is not valid on the implicit button role.
    const Button = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(await ssr(Button, { 'aria-checked': 'true' })).not.toContain('aria-checked')
  })

  it('asChild renders child element type, not the default tag', async () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = await ssr(Nav, { asChild: true }, () => h('a', { href: '#target' }, 'link'))
    expect(html).toContain('<a ')
    expect(html).toContain('href="#target"')
    expect(html).not.toContain('<nav')
  })

  it('merges slot class with child class during asChild SSR', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'slot-cls' },
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = await ssr(Box, { asChild: true }, () => h('span', { class: 'child-cls' }))
    expect(html).toContain('slot-cls')
    expect(html).toContain('child-cls')
  })

  // `compose` SSR coverage comes from the shared `ssrConformanceSuite` registration below
  // ("ssr — compose"), not a separate test here.
})

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as Component & { displayName?: string },
  renderToString: (component, props = {}) =>
    renderToString(createSSRApp({ render: () => h(component, props as UnknownProps) })),
})
