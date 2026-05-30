// @vitest-environment jsdom
import { createElement, createRef, act } from 'react'
import { createRoot } from 'react-dom/client'
import { conformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { ChildSpec, ConformanceComponent } from '@praxis-ui/adapter-utils/testing'
import type { ComponentType, ReactNode } from 'react'
import type { UnknownProps } from '@/shared'
import { createContractComponent } from './create-contract-component'

function toReactNode(c: ChildSpec): ReactNode {
  if ('component' in c) {
    return createElement(
      c.component as unknown as ComponentType<UnknownProps>,
      (c.props ?? {}) as never,
      ...(c.children ?? []).map(toReactNode),
    )
  }
  return createElement(c.tag as never, (c.props ?? {}) as never)
}

function normalizeClass(props: Record<string, unknown>): Record<string, unknown> {
  const { class: cls, ...rest } = props
  return cls !== undefined ? { ...rest, className: cls } : rest
}

let container: HTMLElement
let root: ReturnType<typeof createRoot>

conformanceSuite({
  createComponent: (options) => createContractComponent(options as never) as ConformanceComponent,
  render: (component, props = {}, children = []) => {
    const doRender = (p: Record<string, unknown>, ch: ChildSpec[]) => {
      act(() => {
        root.render(
          createElement(
            component as unknown as ComponentType<UnknownProps>,
            normalizeClass(p) as never,
            ...ch.map(toReactNode),
          ),
        )
      })
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
        act(() => root.unmount())
      },
    }
  },
  setup: () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  },
  cleanup: () => {
    act(() => root.unmount())
    document.body.removeChild(container)
  },
  createRef: () => createRef<HTMLElement>(),
})
