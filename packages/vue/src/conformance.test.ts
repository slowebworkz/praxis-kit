// @vitest-environment jsdom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
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
import { createContractComponent } from './create-contract-component'
import type { VNode } from 'vue'

function toVNode(c: ChildSpec): VNode {
  if ('component' in c) {
    const inner = c.children?.length ? { default: () => c.children!.map(toVNode) } : undefined
    return h(c.component as never, c.props ?? {}, inner)
  }
  return h(c.tag, c.props ?? {})
}

const adapter: ConformanceAdapter<ConformanceComponent> = {
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ConformanceComponent,
  render: (component, props = {}, children = []) => {
    let wrapper = mount(component as never, {
      props: props as never,
      attachTo: document.body,
      ...(props.asChild === true || children.length > 0
        ? { slots: { default: () => children.map(toVNode) } }
        : {}),
    })
    return {
      get element() {
        return wrapper.element as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        wrapper.unmount()
        wrapper = mount(component as never, {
          props: newProps as never,
          attachTo: document.body,
          ...(newProps.asChild === true || newChildren.length > 0
            ? { slots: { default: () => newChildren.map(toVNode) } }
            : {}),
        })
      },
      unmount() {
        wrapper.unmount()
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
