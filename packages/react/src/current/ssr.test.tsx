// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import type { UnknownProps } from '@/shared'
import { createPolymorphicComponent } from './create-polymorphic-component'

function ssr(comp: unknown, props?: UnknownProps, ...children: ReactNode[]) {
  return renderToString(
    createElement(comp as ComponentType<UnknownProps>, props ?? {}, ...children),
  )
}

describe('createPolymorphicComponent — SSR (react-dom/server)', () => {
  it('renders to HTML without accessing browser globals', () => {
    const Nav = createPolymorphicComponent({ tag: 'nav', enforcement: { strict: false } })
    expect(ssr(Nav)).toContain('<nav')
  })

  it('applies base class in server-rendered HTML', () => {
    const Box = createPolymorphicComponent({
      tag: 'div',
      styling: { base: 'box-base' },
      enforcement: { strict: false },
    })
    expect(ssr(Box)).toContain('box-base')
  })

  it('strips redundant ARIA role — server HTML agrees with what client hydration would produce', () => {
    // nav has implicit role="navigation"; passing it explicitly is redundant.
    // The engine must strip it on the server so the attribute set matches client hydration.
    const Nav = createPolymorphicComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = ssr(Nav, { role: 'navigation' })
    expect(html).toContain('<nav')
    expect(html).not.toContain('role=')
  })

  it('strips invalid aria-* attribute — server HTML agrees with what client hydration would produce', () => {
    // aria-checked is not valid on the implicit button role.
    const Button = createPolymorphicComponent({ tag: 'button', enforcement: { strict: false } })
    expect(ssr(Button, { 'aria-checked': 'true' })).not.toContain('aria-checked')
  })

  it('applies variant class in server-rendered HTML', () => {
    const Box = createPolymorphicComponent({
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
    const Nav = createPolymorphicComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = ssr(Nav, { as: 'section' })
    expect(html).toContain('<section')
    expect(html).not.toContain('<nav')
  })

  it('asChild renders child element type, not the default tag', () => {
    const Nav = createPolymorphicComponent({ tag: 'nav', enforcement: { strict: false } })
    const html = ssr(Nav, { asChild: true }, createElement('a', { href: '#target' }, 'link'))
    expect(html).toContain('<a ')
    expect(html).toContain('href="#target"')
    expect(html).not.toContain('<nav')
  })

  it('merges slot class with child class during asChild SSR', () => {
    const Box = createPolymorphicComponent({
      tag: 'div',
      styling: { base: 'slot-cls' },
      enforcement: { strict: false },
    })
    const html = ssr(Box, { asChild: true }, createElement('span', { className: 'child-cls' }))
    expect(html).toContain('slot-cls')
    expect(html).toContain('child-cls')
  })
})
