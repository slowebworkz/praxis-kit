// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { h, createSSRApp } from 'vue'
import type { Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
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
  it('renders to HTML without accessing browser globals', async () => {
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    expect(await ssr(Nav)).toContain('<nav')
  })

  it('applies base class in server-rendered HTML', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-base' },
      enforcement: { strict: false },
    })
    expect(await ssr(Box)).toContain('box-base')
  })

  it('strips redundant ARIA role — server HTML agrees with what client hydration would produce', async () => {
    // nav has implicit role="navigation"; passing it explicitly is redundant.
    // The engine must strip it on the server so the attribute set matches client hydration.
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = await ssr(Nav, { role: 'navigation' })
    expect(html).toContain('<nav')
    expect(html).not.toContain('role=')
  })

  it('strips invalid aria-* attribute — server HTML agrees with what client hydration would produce', async () => {
    // aria-checked is not valid on the implicit button role.
    const Button = createContractComponent({ tag: 'button', enforcement: { strict: false } })
    expect(await ssr(Button, { 'aria-checked': 'true' })).not.toContain('aria-checked')
  })

  it('applies variant class in server-rendered HTML', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: {
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        defaults: { size: 'lg' },
      },
      enforcement: { strict: false },
    })
    expect(await ssr(Box)).toContain('text-lg')
  })

  it('as prop overrides the default tag in server-rendered HTML', async () => {
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = await ssr(Nav, { as: 'section' })
    expect(html).toContain('<section')
    expect(html).not.toContain('<nav')
  })

  it('asChild renders child element type, not the default tag', async () => {
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = await ssr(Nav, { asChild: true }, () => h('a', { href: '#target' }, 'link'))
    expect(html).toContain('<a ')
    expect(html).toContain('href="#target"')
    expect(html).not.toContain('<nav')
  })

  it('merges slot class with child class during asChild SSR', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'slot-cls' },
      enforcement: { strict: false },
    })
    const html = await ssr(Box, { asChild: true }, () => h('span', { class: 'child-cls' }))
    expect(html).toContain('slot-cls')
    expect(html).toContain('child-cls')
  })
})
