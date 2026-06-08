// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToString } from 'solid-js/web'
import type { Component } from 'solid-js'
import { ssrConformanceSuite } from '@praxis-kit/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-utils/testing'
import { createContractComponent } from './create-contract-component'
import type { UnknownProps } from './types'

describe('createContractComponent — SSR (solid-js/web renderToString)', () => {
  it('renders to HTML without accessing browser globals', () => {
    const Comp = createContractComponent({ tag: 'div' })
    expect(() => renderToString(() => <Comp />)).not.toThrow()
  })

  it('applies base class in server-rendered HTML', () => {
    const Comp = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
    const html = renderToString(() => <Comp />)
    expect(html).toContain('base-class')
  })

  it('strips redundant ARIA role — server HTML agrees with what client hydration would produce', () => {
    const Comp = createContractComponent({ tag: 'button', enforcement: { strict: false } })
    const html = renderToString(() => <Comp role="button" />)
    // The redundant role should be stripped before serialisation
    expect(html).not.toContain('role=')
  })

  it('applies variant class in server-rendered HTML', () => {
    const Comp = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { intent: { primary: 'box--primary' } },
      },
    })
    const html = renderToString(() => <Comp intent="primary" />)
    expect(html).toContain('box--primary')
  })

  it('as prop overrides the default tag in server-rendered HTML', () => {
    const Comp = createContractComponent({ tag: 'div' })
    const html = renderToString(() => <Comp as="section" />)
    expect(html).toContain('<section')
    expect(html).not.toContain('<div')
  })
})

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as Component<UnknownProps> & {
      displayName?: string
    },
  renderToString: (component, props = {}) => {
    const Comp = component
    return renderToString(() => <Comp {...(props as UnknownProps)} />)
  },
})
