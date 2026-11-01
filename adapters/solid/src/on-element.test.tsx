// @vitest-environment jsdom
/**
 * `onElement` coverage for Solid. The behaviour — the real element reaches the hook, getProps()
 * tracks current props without re-registering, the returned cleanup fires on unmount — is the
 * shared `onElementSuite`; this file supplies Solid's mounting. Uses a native `<dialog>` as the
 * motivating case: showModal()/close() and the dialog's own native close/cancel events require
 * the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import type { JSX } from 'solid-js'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import type { OnElementAdapter } from '@praxis-kit/adapter-testing'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

const adapter: OnElementAdapter = {
  mount: (hook, label) => {
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: hook,
    })
    const [current, setCurrent] = createSignal<string | undefined>(label)

    // `label` isn't a declared prop of Dialog, so view the component through a loose props type
    // and pass it as a plain attribute. Spreading `{ label: current() }` instead would make the
    // whole props object one dynamic spread, invalidating every read — including the `ref`
    // getter that registers `onElement` — and re-fire the hook on each change.
    const LooseDialog = Dialog as unknown as (props: { label?: string | undefined }) => JSX.Element
    const { container, unmount } = solidRender(() => <LooseDialog label={current()} />)
    return {
      element: container.querySelector('dialog')!,
      setLabel: (next) => {
        setCurrent(next)
      },
      unmount,
    }
  },
  mountPlain: () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    solidRender(() => <Plain />)
  },
  // Known divergence: any prop change re-applies `ref`, so the hook re-runs (previous cleanup
  // first). The old Solid test never changed a prop, so it never exercised this.
  capabilities: { hookReRunsOnPropChange: true },
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
