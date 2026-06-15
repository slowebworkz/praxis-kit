// @vitest-environment jsdom
import { createElement, createRef, act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  conformanceSuite,
  conformanceA11ySuite,
  conformancePerformanceSuite,
  conformanceIsolationSuite,
} from '@praxis-kit/adapter-utils/testing'
import type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceAdapter,
} from '@praxis-kit/adapter-utils/testing'
import type { ComponentType, ReactNode } from 'react'
import type { UnknownProps } from '@praxis-kit/react/shared'
import { createContractComponent } from './create-contract-component'

type ReactConformanceComponent = ComponentType<UnknownProps> & { displayName?: string }

function toReactNode(c: ChildSpec): ReactNode {
  if ('component' in c) {
    return createElement(
      c.component as ReactConformanceComponent,
      (c.props ?? {}) as UnknownProps,
      ...(c.children ?? []).map(toReactNode),
    )
  }
  return createElement(c.tag, (c.props ?? {}) as UnknownProps)
}

function normalizeClass<T extends Record<string, unknown>>(props: T): T {
  const { class: cls, ...rest } = props
  return (cls !== undefined ? { ...rest, className: cls } : rest) as T
}

let container: HTMLElement

const adapter: ConformanceAdapter<ReactConformanceComponent> = {
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ReactConformanceComponent,
  render: (component, props = {}, children = []) => {
    const wrapper = document.createElement('div')
    container.appendChild(wrapper)
    const root = createRoot(wrapper)
    const doRender = (p: Record<string, unknown>, ch: ChildSpec[]) => {
      act(() => {
        root.render(
          createElement(component, normalizeClass(p) as UnknownProps, ...ch.map(toReactNode)),
        )
      })
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
        act(() => root.unmount())
        wrapper.remove()
      },
    }
  },
  setup: () => {
    container = document.createElement('div')
    document.body.appendChild(container)
  },
  cleanup: () => {
    if (container?.parentNode) container.parentNode.removeChild(container)
  },
  createRef: () => createRef<HTMLElement>(),
}

conformanceSuite(adapter)
conformanceA11ySuite(adapter)

conformancePerformanceSuite(adapter)
conformanceIsolationSuite(adapter)
