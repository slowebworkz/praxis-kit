// @vitest-environment jsdom
import { h, createRef } from 'preact'
import { render } from 'preact'
import { conformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { ChildSpec, ConformanceComponent } from '@praxis-ui/adapter-utils/testing'
import { createContractComponent } from './create-contract-component'
import type { ComponentType, VNode } from 'preact'
import type { UnknownProps } from './types'

function toVNode(c: ChildSpec): VNode {
  if ('component' in c) {
    return h(
      c.component as unknown as ComponentType<UnknownProps>,
      (c.props ?? {}) as never,
      ...(c.children ?? []).map(toVNode),
    )
  }
  return h(c.tag as never, (c.props ?? {}) as never)
}

function normalizeClass(props: Record<string, unknown>): Record<string, unknown> {
  const { class: cls, ...rest } = props
  return cls !== undefined ? { ...rest, className: cls } : rest
}

let container: HTMLElement

conformanceSuite({
  createComponent: (options) => createContractComponent(options as never) as ConformanceComponent,
  render: (component, props = {}, children = []) => {
    const doRender = (p: Record<string, unknown>, ch: ChildSpec[]) => {
      render(
        h(
          component as unknown as ComponentType<UnknownProps>,
          normalizeClass(p) as never,
          ...ch.map(toVNode),
        ),
        container,
      )
    }
    doRender(props, children)
    return {
      get element() {
        return container.firstElementChild as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        doRender(newProps, newChildren)
      },
      unmount() {
        render(null, container)
      },
    }
  },
  setup: () => {
    container = document.createElement('div')
    document.body.appendChild(container)
  },
  cleanup: () => {
    render(null, container)
    document.body.removeChild(container)
  },
  createRef: () => createRef<HTMLElement>(),
})
