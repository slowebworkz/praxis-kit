// @vitest-environment jsdom
import { h, render } from 'vue'
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
  ConformanceComponent,
} from '@praxis-kit/adapter-utils/testing'
import type { AnyRecord } from '@praxis-kit/primitive'
import { createContractComponent } from './create-contract-component'
import type { Component, VNode } from 'vue'

function toVNode(c: ChildSpec): VNode {
  if ('component' in c) {
    const inner = c.children?.length ? { default: () => c.children!.map(toVNode) } : undefined
    return h(c.component as Component, c.props ?? {}, inner)
  }
  return h(c.tag, c.props ?? {})
}

const adapter: ConformanceAdapter<ConformanceComponent> = {
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ConformanceComponent,
  render: (component, props = {}, children = []) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // `render(h(component, ...), container)` a second time PATCHES the existing instance — a real
    // Vue update, not an unmount+remount — so the perf/isolation suites can observe update
    // behaviour (function-ref re-invocation, computed re-evaluation) the way they do on React.
    const paint = (p: AnyRecord, ch: ChildSpec[]): void => {
      const slots =
        p.asChild === true || ch.length > 0 ? { default: () => ch.map(toVNode) } : undefined
      render(h(component as Component, p, slots), container)
    }

    paint(props, children)

    return {
      get element() {
        return container.firstElementChild as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        paint(newProps, newChildren)
      },
      unmount() {
        render(null, container)
        container.remove()
      },
    }
  },
  setup: () => {},
  cleanup: () => {},
}

conformanceSuite(adapter)
conformanceA11ySuite(adapter)

conformancePerformanceSuite(adapter)
conformanceIsolationSuite(adapter)
