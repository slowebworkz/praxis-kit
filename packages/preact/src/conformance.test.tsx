// @vitest-environment jsdom
import { h, createRef } from 'preact'
import { render } from 'preact'
import {
  conformanceSuite,
  conformanceA11ySuite,
  conformancePerformanceSuite,
  conformanceIsolationSuite,
} from '@praxis-ui/adapter-utils/testing'
import type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceAdapter,
} from '@praxis-ui/adapter-utils/testing'
import type { ComponentType, VNode } from 'preact'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

type PreactConformanceComponent = ComponentType<UnknownProps> & { displayName?: string }

function toVNode(c: ChildSpec): VNode<UnknownProps> {
  if ('component' in c) {
    return h(
      c.component as PreactConformanceComponent,
      (c.props ?? {}) as UnknownProps,
      ...(c.children ?? []).map(toVNode),
    ) as VNode<UnknownProps>
  }
  return h(c.tag as string, (c.props ?? {}) as UnknownProps) as VNode<UnknownProps>
}

function normalizeClass<T extends Record<string, unknown>>(props: T): T {
  const { class: cls, ...rest } = props
  return (cls !== undefined ? { ...rest, className: cls } : rest) as T
}

let container: HTMLElement

const adapter: ConformanceAdapter<PreactConformanceComponent> = {
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as PreactConformanceComponent,
  render: (component, props = {}, children = []) => {
    const wrapper = document.createElement('div')
    container.appendChild(wrapper)
    const doRender = (p: Record<string, unknown>, ch: ChildSpec[]) => {
      render(h(component, normalizeClass(p) as UnknownProps, ...ch.map(toVNode)), wrapper)
    }
    doRender(props, children)
    return {
      get element() {
        return wrapper.firstElementChild as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        doRender(newProps, newChildren)
      },
      unmount() {
        render(null, wrapper)
        wrapper.remove()
      },
    }
  },
  setup: () => {
    container = document.createElement('div')
    document.body.appendChild(container)
  },
  cleanup: () => {
    render(null, container)
    if (container?.parentNode) container.parentNode.removeChild(container)
  },
  createRef: () => createRef<HTMLElement>(),
}

conformanceSuite(adapter)
conformanceA11ySuite(adapter)

conformancePerformanceSuite(adapter)
conformanceIsolationSuite(adapter)
