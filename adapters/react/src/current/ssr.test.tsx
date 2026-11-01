// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-testing'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { UnknownProps } from '../shared'
import { createContractComponent } from './create-contract-component'

function ssr(comp: unknown, props?: UnknownProps, ...children: ReactNode[]) {
  return renderToString(
    createElement(comp as ComponentType<UnknownProps>, props ?? {}, ...children),
  )
}

describe('createContractComponent — SSR (react-dom/server)', () => {
  it('strips invalid aria-* attribute — server HTML agrees with what client hydration would produce', () => {
    // aria-checked is not valid on the implicit button role.
    const Button = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    expect(ssr(Button, { 'aria-checked': 'true' })).not.toContain('aria-checked')
  })

  it('asChild renders child element type, not the default tag', () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = ssr(Nav, { asChild: true }, createElement('a', { href: '#target' }, 'link'))
    expect(html).toContain('<a ')
    expect(html).toContain('href="#target"')
    expect(html).not.toContain('<nav')
  })

  it('merges slot class with child class during asChild SSR', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'slot-cls' },
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = ssr(Box, { asChild: true }, createElement('span', { className: 'child-cls' }))
    expect(html).toContain('slot-cls')
    expect(html).toContain('child-cls')
  })

  // `compose` SSR coverage comes from the shared `ssrConformanceSuite` registration below
  // ("ssr — compose"), not a separate test here.
})

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ComponentType<UnknownProps> & {
      displayName?: string
    },
  renderToString: (component, props = {}) => {
    const { class: cls, ...rest } = props
    const normalized = cls !== undefined ? { ...rest, className: cls } : rest
    return renderToString(
      createElement(component as ComponentType<UnknownProps>, normalized as UnknownProps),
    )
  },
})
