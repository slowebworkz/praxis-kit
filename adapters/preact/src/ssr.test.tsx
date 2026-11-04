// @vitest-environment node
import { h } from 'preact'
import type { ComponentType, VNode } from 'preact'
import { renderToString } from 'preact-render-to-string'
import { classToClassName, ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions, ChildSpec } from '@praxis-kit/adapter-testing'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

function toNode(child: ChildSpec): VNode {
  const props = classToClassName((child.props ?? {}) as UnknownProps)
  const kids = (child.children ?? []).map(toNode)
  return 'tag' in child
    ? h(child.tag, props, ...kids)
    : h(child.component as unknown as ComponentType<UnknownProps>, props, ...kids)
}

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ComponentType<UnknownProps> & {
      displayName?: string
    },
  renderToString: (component, props = {}, children = []) =>
    renderToString(
      h(
        component as ComponentType<UnknownProps>,
        classToClassName(props as UnknownProps),
        ...children.map(toNode),
      ),
    ),
})
