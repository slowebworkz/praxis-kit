// @vitest-environment jsdom
/**
 * Proves the `onElement` compound mechanism end-to-end in Preact: the real DOM element
 * reaches the hook once per mount, getProps() reflects current props without
 * re-registering, and the returned cleanup fires on unmount. Uses a native `<dialog>`
 * element as the motivating case — showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'
import type { ComponentType } from 'preact'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

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

describe('onElement (event-handler wiring spike)', () => {
  it('receives the real element and can call native imperative methods on it', () => {
    let received: Element | undefined
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: (el) => {
        received = el
      },
    })

    render(h(box(Dialog), null), container)
    expect(received).toBeInstanceOf(HTMLDialogElement)
    expect(received).toBe(container.querySelector('dialog'))
  })

  it('getProps() reflects current props without re-registering the listener', () => {
    let listenerAttachCount = 0
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: (el, getProps) => {
        const handleClose = () => (getProps() as { onDialogClose?: () => void }).onDialogClose?.()
        el.addEventListener('close', handleClose)
        listenerAttachCount++
        return () => el.removeEventListener('close', handleClose)
      },
    })

    const firstOnClose = vi.fn()
    render(h(box(Dialog), { onDialogClose: firstOnClose }), container)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(firstOnClose).toHaveBeenCalledTimes(1)

    const onDialogClose = vi.fn()
    render(h(box(Dialog), { onDialogClose }), container)
    expect(listenerAttachCount).toBe(1)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(onDialogClose).toHaveBeenCalledTimes(1)
    expect(firstOnClose).toHaveBeenCalledTimes(1)
  })

  it('runs the returned cleanup on unmount', () => {
    const cleanup = vi.fn()
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: () => cleanup,
    })

    render(h(box(Dialog), null), container)
    expect(cleanup).not.toHaveBeenCalled()
    render(null, container)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a plain component with no onElement option is unaffected', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    expect(() => render(h(box(Plain), null), container)).not.toThrow()
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
