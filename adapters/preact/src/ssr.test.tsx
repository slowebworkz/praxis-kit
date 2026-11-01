// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { h } from 'preact'
import type { ComponentType } from 'preact'
import { renderToString } from 'preact-render-to-string'
import { ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-testing'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

function ssr(comp: unknown, props?: UnknownProps, ...children: unknown[]) {
  return renderToString(
    h(comp as ComponentType<UnknownProps>, props ?? {}, ...(children as Parameters<typeof h>[2][])),
  )
}

describe('createContractComponent — SSR (preact-render-to-string)', () => {
  it('asChild renders child element type, not the default tag', () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = ssr(Nav, { asChild: true }, h('a', { href: '#target' }, 'link'))
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
    const html = ssr(Box, { asChild: true }, h('span', { className: 'child-cls' }))
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
    return renderToString(h(component as ComponentType<UnknownProps>, normalized as UnknownProps))
  },
})
