// @vitest-environment jsdom
/**
 * `onElement` coverage for Svelte. The behaviour — the real element reaches the hook, getProps()
 * tracks current props without re-registering, the returned cleanup fires on unmount — is the
 * shared `onElementSuite`; this file supplies Svelte's mounting. Uses a native `<dialog>` as the
 * motivating case: showModal()/close() and the dialog's own native close/cancel events require
 * the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import type { OnElementAdapter } from '@praxis-kit/adapter-testing'
import Polymorphic from './Polymorphic.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

const adapter: OnElementAdapter = {
  mount: (hook, label) => {
    const bundle = createContractComponent({ tag: 'dialog', name: 'Dialog', onElement: hook })
    const { container, rerender, unmount } = render(Polymorphic, { bundle, label })
    return {
      element: container.querySelector('dialog')!,
      setLabel: async (next) => {
        await rerender({ bundle, label: next })
      },
      unmount,
    }
  },
  mountPlain: () => {
    const bundle = createContractComponent({ tag: 'div', name: 'Plain' })
    render(Polymorphic, { bundle })
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
