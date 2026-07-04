import { createElement, createRef, act } from 'react'
import { createRoot } from 'react-dom/client'
import type {
  ConformanceAdapter,
  BareFactoryOptions,
  ChildSpec,
} from '@praxis-kit/adapter-utils/testing'
import type { ComponentType, ReactNode } from 'react'
import type { AnyRecord } from '@praxis-kit/primitive'
import type { UnknownProps } from './types'

export type ReactConformanceComponent = ComponentType<UnknownProps> & { displayName?: string }

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

function normalizeClass<T extends AnyRecord>(props: T): T {
  const { class: cls, ...rest } = props
  return (cls !== undefined ? { ...rest, className: cls } : rest) as T
}

export function makeReactConformanceAdapter(
  createComponent: (options: BareFactoryOptions) => ReactConformanceComponent,
): ConformanceAdapter<ReactConformanceComponent> {
  let container: HTMLElement

  return {
    createComponent,
    render: (component, props = {}, children = []) => {
      const wrapper = document.createElement('div')
      container.appendChild(wrapper)
      const root = createRoot(wrapper)
      const doRender = (p: AnyRecord, ch: ChildSpec[]) => {
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
}
