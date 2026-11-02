// @vitest-environment node
import { createElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { classToClassName, ssrConformanceSuite } from '@praxis-kit/adapter-testing'
import type { BareFactoryOptions, ChildSpec } from '@praxis-kit/adapter-testing'
import type { UnknownProps } from '../shared'
import { createContractComponent } from './create-contract-component'

function toNode(child: ChildSpec): ReactNode {
  const props = classToClassName((child.props ?? {}) as UnknownProps)
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
        classToClassName(props as UnknownProps),
        ...children.map(toNode),
      ),
    ),
})
