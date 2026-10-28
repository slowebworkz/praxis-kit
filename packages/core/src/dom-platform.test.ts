// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import type { AnyRecord } from '@praxis-kit/primitive'
import {
  isBackdropClick,
  listenForPopoverToggle,
  supportsClosedBy,
  syncDialogState,
} from './dom-platform'

describe('isBackdropClick', () => {
  it('matches only events targeted at the dialog element', () => {
    const dialog = document.createElement('dialog')
    const child = document.createElement('button')
    dialog.append(child)

    const event = new Event('click')
    Object.defineProperty(event, 'target', { value: dialog })
    expect(isBackdropClick(event, dialog)).toBe(true)

    const childEvent = new Event('click')
    Object.defineProperty(childEvent, 'target', { value: child })
    expect(isBackdropClick(childEvent, dialog)).toBe(false)
  })
})

describe('supportsClosedBy', () => {
  it('reports whether the native prototype exposes closedBy', () => {
    const expected = 'closedBy' in HTMLDialogElement.prototype
    expect(supportsClosedBy()).toBe(expected)
  })
})

describe('syncDialogState', () => {
  function withDialogMethod(
    name: 'showModal' | 'close',
    implementation: (dialog: HTMLDialogElement) => void,
    run: (mock: ReturnType<typeof vi.fn>) => void,
  ): void {
    const prototype = HTMLDialogElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name)
    const mock = vi.fn(function (this: HTMLDialogElement) {
      implementation(this)
    })
    Object.defineProperty(prototype, name, {
      configurable: true,
      writable: true,
      value: mock,
    })

    try {
      run(mock)
    } finally {
      if (descriptor) Object.defineProperty(prototype, name, descriptor)
      else delete (prototype as unknown as AnyRecord)[name]
    }
  }

  it('opens a closed dialog modally', () => {
    const dialog = document.createElement('dialog')
    withDialogMethod(
      'showModal',
      (node) => {
        Object.defineProperty(node, 'open', { configurable: true, value: true })
      },
      (showModal) => {
        syncDialogState(dialog, true)
        expect(showModal).toHaveBeenCalledOnce()
      },
    )
  })

  it('closes an open dialog', () => {
    const dialog = document.createElement('dialog')
    Object.defineProperty(dialog, 'open', { configurable: true, value: true })
    withDialogMethod(
      'close',
      (node) => {
        Object.defineProperty(node, 'open', { configurable: true, value: false })
      },
      (close) => {
        syncDialogState(dialog, false)
        expect(close).toHaveBeenCalledOnce()
      },
    )
  })

  it('does not call native methods when already synchronized', () => {
    const dialog = document.createElement('dialog')
    const showModal = vi.fn()
    const close = vi.fn()
    Object.defineProperty(dialog, 'showModal', { configurable: true, value: showModal })
    Object.defineProperty(dialog, 'close', { configurable: true, value: close })

    syncDialogState(dialog, false)
    expect(showModal).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })

  it('bypasses instance-level wrappers during synchronization', () => {
    const dialog = document.createElement('dialog')
    Object.defineProperty(dialog, 'showModal', { configurable: true, value: vi.fn() })
    withDialogMethod(
      'showModal',
      (node) => {
        Object.defineProperty(node, 'open', { configurable: true, value: true })
      },
      (showModal) => {
        syncDialogState(dialog, true)
        expect(showModal).toHaveBeenCalledOnce()
        expect(dialog.showModal).not.toHaveBeenCalled()
      },
    )
  })
})

describe('listenForPopoverToggle', () => {
  it('reports open and closed transitions and can unsubscribe', () => {
    const node = document.createElement('div')
    const onOpenChange = vi.fn()
    const unsubscribe = listenForPopoverToggle(node, onOpenChange)

    const opened = new Event('toggle')
    Object.defineProperty(opened, 'newState', { value: 'open' })
    node.dispatchEvent(opened)

    const closed = new Event('toggle')
    Object.defineProperty(closed, 'newState', { value: 'closed' })
    node.dispatchEvent(closed)

    const unknown = new Event('toggle')
    Object.defineProperty(unknown, 'newState', { value: 'other' })
    node.dispatchEvent(unknown)

    expect(onOpenChange.mock.calls).toEqual([[true], [false]])

    unsubscribe()
    const afterUnsubscribe = new Event('toggle')
    Object.defineProperty(afterUnsubscribe, 'newState', { value: 'open' })
    node.dispatchEvent(afterUnsubscribe)
    expect(onOpenChange).toHaveBeenCalledTimes(2)
  })
})
