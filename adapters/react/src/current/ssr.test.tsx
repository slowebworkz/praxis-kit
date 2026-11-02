// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions, ChildSpec } from '@praxis-kit/adapter-testing'
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

  // `compose` SSR coverage comes from the shared `ssrConformanceSuite` registration below
  // ("ssr — compose"), not a separate test here.
})

// React takes `className`, the suite's neutral `class`.
function toReactProps(props: UnknownProps): UnknownProps {
  const { class: cls, ...rest } = props
  return (cls !== undefined ? { ...rest, className: cls } : rest) as UnknownProps
}

function toNode(child: ChildSpec): ReactNode {
  const props = toReactProps((child.props ?? {}) as UnknownProps)
  const kids = (child.children ?? []).map(toNode)
  return 'tag' in child
    ? createElement(child.tag, props, ...kids)
    : createElement(child.component as unknown as ComponentType<UnknownProps>, props, ...kids)
}

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ComponentType<UnknownProps> & {
      displayName?: string
    },
  renderToString: (component, props = {}, children = []) =>
    renderToString(
      createElement(
        component as ComponentType<UnknownProps>,
        toReactProps(props as UnknownProps),
        ...children.map(toNode),
      ),
    ),
})
