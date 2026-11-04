// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { h, createSSRApp } from 'vue'
import type { Component, VNode } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions, ChildSpec } from '@praxis-kit/adapter-testing'
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

  // `compose` SSR coverage comes from the shared `ssrConformanceSuite` registration below
  // ("ssr — compose"), not a separate test here.
})

function toVNode(child: ChildSpec): VNode {
  const kids = (child.children ?? []).map(toVNode)
  return 'tag' in child
    ? h(child.tag, child.props ?? {}, kids)
    : h(child.component as unknown as Component, child.props ?? {}, { default: () => kids })
}

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as Component & { displayName?: string },
  renderToString: (component, props = {}, children) =>
    renderToString(
      createSSRApp({
        render: () =>
          h(
            component,
            props as UnknownProps,
            children ? { default: () => children.map(toVNode) } : undefined,
          ),
      }),
    ),
})
