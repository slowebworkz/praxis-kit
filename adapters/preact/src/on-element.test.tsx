// @vitest-environment jsdom
/**
 * `onElement` coverage for Preact. The shared behaviour — the real element reaches the hook,
 * getProps() tracks current props without re-registering, the returned cleanup fires on
 * unmount — is the shared `onElementSuite`; this file supplies Preact's mounting, keeps the
 * assertion that needs a native `<dialog>` host, and the lifecycle matrix below, which exercises
 * this adapter's own ref/registration mechanics. showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
 * Lifecycle matrix for the callback-ref registration in `create-contract-component.ts` —
 * mirrors `@praxis-kit/react`'s.
 */
describe('onElement lifecycle', () => {
  it('runs the previous cleanup before registering against a replacement element', () => {
    const log: string[] = []
    const Box = createContractComponent({
      tag: 'div' as const,
      name: 'Box',
      onElement: (el) => {
        const tag = el.tagName.toLowerCase()
        log.push(`register:${tag}`)
        return () => log.push(`cleanup:${tag}`)
      },
    })

    // Changing `as` swaps the host element type — Preact unmounts the old node and mounts a new
    // one, firing the callback ref null (old) then the replacement.
    render(h(box(Box), { as: 'section' }), container)
    render(h(box(Box), { as: 'article' }), container)

    expect(log).toEqual(['register:section', 'cleanup:section', 'register:article'])
  })

  it('runs cleanup exactly once on unmount', () => {
    const cleanup = vi.fn()
    const Box = createContractComponent({
      tag: 'div' as const,
      name: 'Box',
      onElement: () => cleanup,
    })

    render(h(box(Box), null), container)
    render(h('span', null), container) // unmounts Box
    render(h('p', null), container)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('tolerates an onElement that returns nothing', () => {
    const Box = createContractComponent({
      tag: 'div' as const,
      name: 'Box',
      onElement: () => {
        /* no cleanup */
      },
    })

    expect(() => {
      render(h(box(Box), null), container)
      render(h('span', null), container)
    }).not.toThrow()
  })

  it('a throwing onElement does not leave a stale, already-run cleanup to fire on unmount', () => {
    const firstCleanup = vi.fn()
    let calls = 0
    const Box = createContractComponent({
      tag: 'div' as const,
      name: 'Box',
      onElement: () => {
        calls += 1
        if (calls === 1) return firstCleanup
        throw new Error('onElement failed on the replacement element')
      },
    })

    render(h(box(Box), { as: 'section' }), container)
    expect(() => render(h(box(Box), { as: 'article' }), container)).toThrow('onElement failed')
    expect(firstCleanup).toHaveBeenCalledTimes(1)

    render(h('span', null), container)
    expect(firstCleanup).toHaveBeenCalledTimes(1)
  })
})
