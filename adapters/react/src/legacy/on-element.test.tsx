// @vitest-environment jsdom
/**
 * `onElement` coverage for the React 18 (legacy, forwardRef) adapter. The shared behaviour — the
 * real element reaches the hook, getProps() tracks current props without re-registering, the
 * returned cleanup fires on unmount — is the shared `onElementSuite`; this file supplies React's
 * mounting, keeps the assertion that needs a native `<dialog>` host, and the lifecycle matrix
 * below, which exercises this adapter's own ref/registration mechanics. showModal()/close() and
 * the dialog's own native close/cancel events require the real node, not a props-based synthetic
 * handler.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { box, useReactDom } from '../shared/test-utils'
import { createContractComponent } from './create-contract-component'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import type { OnElementAdapter } from '@praxis-kit/adapter-testing'

describe('onElement (shared contract, legacy)', () => {
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

/**
 * Lifecycle matrix for the callback-ref registration in `create-contract-component.ts` — the
 * React 18 (forwardRef) adapter's copy mirrors the React 19 one, so the same reasoning applies.
 */
describe('onElement lifecycle (legacy)', () => {
  const dom = useReactDom()

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

    dom.mount(createElement(box(Box), { as: 'section' }))
    dom.mount(createElement(box(Box), { as: 'article' }))

    expect(log).toEqual(['register:section', 'cleanup:section', 'register:article'])
  })

  it('runs cleanup exactly once on unmount', () => {
    const cleanup = vi.fn()
    const Box = createContractComponent({
      tag: 'div' as const,
      name: 'Box',
      onElement: () => cleanup,
    })

    dom.mount(createElement(box(Box)))
    dom.mount(createElement('span'))
    dom.mount(createElement('p'))
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
      dom.mount(createElement(box(Box)))
      dom.mount(createElement('span'))
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

    dom.mount(createElement(box(Box), { as: 'section' }))
    expect(() => dom.mount(createElement(box(Box), { as: 'article' }))).toThrow('onElement failed')
    expect(firstCleanup).toHaveBeenCalledTimes(1)

    dom.mount(createElement('span'))
    expect(firstCleanup).toHaveBeenCalledTimes(1)
  })
})
