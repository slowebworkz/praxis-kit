/**
 * `onElement` coverage for Vue. The shared behaviour — the real element reaches the hook,
 * getProps() tracks current props without re-registering, the returned cleanup fires on
 * unmount — is the shared `onElementSuite`; this file supplies Vue's mounting, keeps the
 * assertion that needs a native `<dialog>` host, and the lifecycle matrix below, which exercises
 * this adapter's own ref/registration mechanics. showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { createContractComponent } from './create-contract-component'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import type { OnElementAdapter } from '@praxis-kit/adapter-testing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: unknown): any {
  return comp
}

const adapter: OnElementAdapter = {
  mount: (hook, label) => {
    const Dialog = createContractComponent({ tag: 'dialog', name: 'Dialog', onElement: hook })
    const wrapper = mount(box(Dialog), { props: label === undefined ? {} : { label } })
    return {
      element: wrapper.element,
      setLabel: async (next) => {
        await wrapper.setProps({ label: next })
      },
      unmount: () => wrapper.unmount(),
    }
  },
  mountPlain: () => {
    const Plain = createContractComponent({ tag: 'div', name: 'Plain' })
    mount(box(Plain))
  },
}

onElementSuite(adapter)

describe('onElement (native host)', () => {
  it('receives a native element it can call imperative methods on', async () => {
    let received: Element | undefined
    await adapter.mount((el) => {
      received = el
    })
    expect(received).toBeInstanceOf(HTMLDialogElement)
  })
})

/**
 * Lifecycle matrix for the function-ref registration in `create-contract-component.ts`. In Vue a
 * user's `ref` on `<Box>` resolves to the component instance, not the host element — `onElement`
 * IS the adapter's contract for reaching the real DOM node, so it is exercised across every
 * render path here (mirrors the react/preact ref matrix).
 */
describe('onElement lifecycle', () => {
  it('receives the `as`-overridden host element', () => {
    let received: Element | undefined
    const Box = createContractComponent({
      tag: 'div',
      name: 'Box',
      onElement: (el) => {
        received = el
      },
    })

    const wrapper = mount(box(Box), { props: { as: 'section' } })
    expect(received).toBe(wrapper.element)
    expect(received?.tagName.toLowerCase()).toBe('section')
  })

  it('receives the slotted child element on the asChild path', () => {
    let received: Element | undefined
    const Box = createContractComponent({
      name: 'Box',
      onElement: (el) => {
        received = el
      },
    })

    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h('a', { href: '#x' })] },
    })
    expect(received).toBe(wrapper.element)
    expect(received?.tagName.toLowerCase()).toBe('a')
  })

  it('runs the previous cleanup before registering against a replacement element', async () => {
    const log: string[] = []
    const Box = createContractComponent({
      tag: 'div',
      name: 'Box',
      onElement: (el) => {
        const tag = el.tagName.toLowerCase()
        log.push(`register:${tag}`)
        return () => log.push(`cleanup:${tag}`)
      },
    })

    const wrapper = mount(box(Box), { props: { as: 'section' } })
    await wrapper.setProps({ as: 'article' })

    expect(log).toEqual(['register:section', 'cleanup:section', 'register:article'])
  })

  it('runs cleanup exactly once on unmount', () => {
    const cleanup = vi.fn()
    const Box = createContractComponent({ tag: 'div', name: 'Box', onElement: () => cleanup })

    const wrapper = mount(box(Box))
    wrapper.unmount()
    wrapper.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('tolerates an onElement that returns nothing', () => {
    const Box = createContractComponent({
      tag: 'div',
      name: 'Box',
      onElement: () => {
        /* no cleanup */
      },
    })

    const wrapper = mount(box(Box))
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('a throwing onElement on a replacement element does not re-run the prior cleanup on unmount', async () => {
    const firstCleanup = vi.fn()
    let calls = 0
    const Box = createContractComponent({
      tag: 'div',
      name: 'Box',
      onElement: () => {
        calls += 1
        if (calls === 1) return firstCleanup
        throw new Error('onElement failed on the replacement element')
      },
    })

    const wrapper = mount(box(Box), { props: { as: 'section' } })
    await expect(wrapper.setProps({ as: 'article' })).rejects.toThrow('onElement failed')
    expect(firstCleanup).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    expect(firstCleanup).toHaveBeenCalledTimes(1)
  })
})
