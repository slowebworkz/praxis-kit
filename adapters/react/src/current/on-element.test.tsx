// @vitest-environment jsdom
/**
 * `onElement` coverage for React. The shared behaviour — the real element reaches the hook,
 * getProps() tracks current props without re-registering, the returned cleanup fires on
 * unmount, and the host-replacement lifecycle — is the shared `onElementSuite`; this file
 * supplies React's mounting and keeps the assertion that needs a native `<dialog>` host.
 * showModal()/close() and the dialog's own native close/cancel events require the real node, not a
 * props-based synthetic handler.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { box, useReactDom } from '../shared/test-utils'
import { createContractComponent } from './create-contract-component'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import type { OnElementAdapter } from '@praxis-kit/adapter-testing'

describe('onElement (shared contract)', () => {
  const dom = useReactDom()

  const adapter: OnElementAdapter = {
    mount: (hook, label) => {
      const Dialog = createContractComponent({
        tag: 'dialog' as const,
        name: 'Dialog',
        onElement: hook,
      })
      dom.mount(createElement(box(Dialog), label === undefined ? null : { label }))
      return {
        element: dom.container.querySelector('dialog')!,
        setLabel: (next) => {
          dom.mount(createElement(box(Dialog), { label: next }))
        },
        unmount: () => {
          dom.mount(createElement('div'))
        },
      }
    },
    mountPlain: () => {
      const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
      dom.mount(createElement(box(Plain)))
    },
    mountSwappable: (hook) => {
      const Box = createContractComponent({ tag: 'div' as const, name: 'Box', onElement: hook })
      dom.mount(createElement(box(Box), { as: 'section' }))
      return {
        setHost: (tag) => {
          dom.mount(createElement(box(Box), { as: tag }))
        },
        unmount: () => {
          dom.mount(createElement('div'))
        },
      }
    },
  }

  onElementSuite(adapter)

  it('receives a native element it can call imperative methods on', async () => {
    let received: Element | undefined
    await adapter.mount((el) => {
      received = el
    })
    expect(received).toBeInstanceOf(HTMLDialogElement)
  })
})
