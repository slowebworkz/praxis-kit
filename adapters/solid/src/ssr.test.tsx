// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToString } from 'solid-js/web'
import type { Component } from 'solid-js'
import { ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-testing'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'
import type { UnknownProps } from './types'

describe('createContractComponent — SSR (solid-js/web renderToString)', () => {
  it('strips redundant ARIA role — server HTML agrees with what client hydration would produce', () => {
    const Comp = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(() => <Comp role="button" />)
    // The redundant role should be stripped before serialisation
    expect(html).not.toContain('role=')
  })

  it('as prop overrides the default tag in server-rendered HTML', () => {
    const Comp = createContractComponent({ tag: 'div' })
    const html = renderToString(() => <Comp as="section" />)
    expect(html).toContain('<section')
    expect(html).not.toContain('<div')
  })

  // `compose` SSR coverage comes from the shared `ssrConformanceSuite` registration below
  // ("ssr — compose"), not a separate test here.
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
