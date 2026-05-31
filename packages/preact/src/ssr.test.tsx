// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { h } from 'preact'
import type { ComponentType } from 'preact'
import { renderToString } from 'preact-render-to-string'
import { ssrConformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-ui/adapter-utils/testing'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

function ssr(comp: unknown, props?: UnknownProps, ...children: unknown[]) {
  return renderToString(
    h(comp as ComponentType<UnknownProps>, props ?? {}, ...(children as Parameters<typeof h>[2][])),
  )
}

describe('createContractComponent — SSR (preact-render-to-string)', () => {
  it('renders to HTML without accessing browser globals', () => {
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    expect(ssr(Nav)).toContain('<nav')
  })

  it('applies base class in server-rendered HTML', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-base' },
      enforcement: { strict: false },
    })
    expect(ssr(Box)).toContain('box-base')
  })

  it('strips redundant ARIA role — server HTML agrees with what client hydration would produce', () => {
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = ssr(Nav, { role: 'navigation' })
    expect(html).toContain('<nav')
    expect(html).not.toContain('role=')
  })

  it('applies variant class in server-rendered HTML', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: {
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        defaults: { size: 'lg' },
      },
      enforcement: { strict: false },
    })
    expect(ssr(Box)).toContain('text-lg')
  })

  it('as prop overrides the default tag in server-rendered HTML', () => {
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = ssr(Nav, { as: 'section' })
    expect(html).toContain('<section')
    expect(html).not.toContain('<nav')
  })

  it('asChild renders child element type, not the default tag', () => {
    const Nav = createContractComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = ssr(Nav, { asChild: true }, h('a', { href: '#target' }, 'link'))
    expect(html).toContain('<a ')
    expect(html).toContain('href="#target"')
    expect(html).not.toContain('<nav')
  })

  it('merges slot class with child class during asChild SSR', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'slot-cls' },
      enforcement: { strict: false },
    })
    const html = ssr(Box, { asChild: true }, h('span', { className: 'child-cls' }))
    expect(html).toContain('slot-cls')
    expect(html).toContain('child-cls')
  })
})

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ComponentType<UnknownProps> & {
      displayName?: string
    },
  renderToString: (component, props = {}) => {
    const { class: cls, ...rest } = props
    const normalized = cls !== undefined ? { ...rest, className: cls } : rest
    return renderToString(h(component as ComponentType<UnknownProps>, normalized as UnknownProps))
  },
})
