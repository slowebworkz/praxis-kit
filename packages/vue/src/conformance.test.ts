// @vitest-environment jsdom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { conformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { ChildSpec, ConformanceComponent } from '@praxis-ui/adapter-utils/testing'
import { createContractComponent } from './create-contract-component'
import type { VNode } from 'vue'

function toVNode(c: ChildSpec): VNode {
  if ('component' in c) {
    const inner = c.children?.length ? { default: () => c.children!.map(toVNode) } : undefined
    return h(c.component as never, c.props ?? {}, inner)
  }
  return h(c.tag, c.props ?? {})
}

conformanceSuite({
  createComponent: (options) => createContractComponent(options as never) as ConformanceComponent,
  render: (component, props = {}, children = []) => {
    let wrapper = mount(component as never, {
      props: props as never,
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
})
