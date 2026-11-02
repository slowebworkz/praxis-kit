// @vitest-environment jsdom
/**
 * `onElement` coverage for Preact. The shared behaviour — the real element reaches the hook,
 * getProps() tracks current props without re-registering, the returned cleanup fires on
 * unmount, and the host-replacement lifecycle — is the shared `onElementSuite`; this file
 * supplies Preact's mounting and keeps the assertion that needs a native `<dialog>` host.
 * showModal()/close() and the dialog's own native close/cancel events require the real node, not a
 * props-based synthetic handler.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'
import type { ComponentType } from 'preact'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import type { OnElementAdapter } from '@praxis-kit/adapter-testing'

function box(comp: { displayName?: string }): ComponentType<UnknownProps> {
  return comp as unknown as ComponentType<UnknownProps>
}

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  render(null, container)
  document.body.removeChild(container)
})

const adapter: OnElementAdapter = {
  mount: (hook, label) => {
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: hook,
    })
    render(h(box(Dialog), label === undefined ? null : { label }), container)
    return {
      element: container.querySelector('dialog')!,
      setLabel: (next) => {
        render(h(box(Dialog), { label: next }), container)
      },
      unmount: () => {
        render(null, container)
      },
    }
  },
  mountPlain: () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    render(h(box(Plain), null), container)
  },
  mountSwappable: (hook) => {
    const Box = createContractComponent({ tag: 'div' as const, name: 'Box', onElement: hook })
    render(h(box(Box), { as: 'section' }), container)
    return {
      setHost: (tag) => {
        render(h(box(Box), { as: tag }), container)
      },
      unmount: () => {
        render(null, container)
      },
    }
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
