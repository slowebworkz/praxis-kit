// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { createContractComponent } from './create-contract-component'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: unknown): any {
  return comp
}

// Vue resolves listener prop keys through `hyphenate(key.slice(2))`, so a multi-word camelCase
// handler like `onKeyDown` would bind to a nonexistent `key-down` event. The adapter lowercases
// the event portion while preserving `Once` / `Passive` / `Capture` modifiers. This matrix pins
// the actual DOM listener behaviour, on both the intrinsic and asChild render paths.

describe('event-name normalization — intrinsic path', () => {
  it.each([
    ['onClick', 'click'],
    ['onKeyDown', 'keydown'],
    ['onPointerDown', 'pointerdown'],
    ['onMouseEnter', 'mouseenter'],
    ['onBeforeInput', 'beforeinput'],
  ])('%s binds to the %s event', async (prop, event) => {
    const handler = vi.fn()
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), {
      props: { [prop]: handler } as never,
      attachTo: document.body,
    })

    await wrapper.trigger(event)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('onClickCapture still binds (the Capture modifier survives normalization)', async () => {
    const order: string[] = []
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), {
      props: { onClickCapture: () => order.push('capture') } as never,
      slots: { default: () => [h('button', { onClick: () => order.push('bubble') })] },
      attachTo: document.body,
    })

    wrapper.get('button').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // The host's capture-phase handler runs before the child's bubbling handler.
    expect(order).toEqual(['capture', 'bubble'])
  })

  it('leaves a single-word handler (`onfoo`) and non-listener attrs untouched', () => {
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), {
      props: { 'data-x': 'keep', onfoo: () => {} } as never,
    })
    expect(wrapper.element.getAttribute('data-x')).toBe('keep')
  })
})

describe('event-name normalization — asChild path', () => {
  it('onKeyDown on the wrapper reaches the slotted child element', async () => {
    const handler = vi.fn()
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), {
      props: { asChild: true, onKeyDown: handler } as never,
      slots: { default: () => [h('input')] },
      attachTo: document.body,
    })

    await wrapper.get('input').trigger('keydown')
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
