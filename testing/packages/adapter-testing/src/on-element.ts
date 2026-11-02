import { describe, expect, it, vi } from 'vitest'
import type { AnyRecord } from '@praxis-kit/core'

/** The `onElement` hook an adapter's component is created with. */
export type OnElementHook = (
  element: Element,
  getProps: () => Readonly<AnyRecord>,
) => void | (() => void)

/** A mounted component under test. */
export type OnElementMounted = {
  /** The host element the hook is expected to have received. */
  readonly element: Element
  /** Change the mounted component's `label` prop and flush any pending render. */
  readonly setLabel: (label: string) => void | Promise<void>
  /** Tear the component down (unmount, or disconnect for element adapters). */
  readonly unmount: () => void | Promise<void>
}

/**
 * Adapter contract for the `onElement` suite. The adapter creates a fresh component whose
 * `onElement` option is the given hook, mounts it with an optional initial `label` prop, and
 * reports how to update and tear it down; the suite owns the behaviour assertions. Mounting,
 * prop updates and teardown are framework-specific, so they stay in the adapter.
 */
export type OnElementAdapter = {
  readonly mount: (
    hook: OnElementHook,
    label?: string,
  ) => OnElementMounted | Promise<OnElementMounted>
  /** Mount a component created without an `onElement` option. Must not throw. */
  readonly mountPlain: () => void | Promise<void>
  /** Known divergences from the standard contract. Unset means the standard behaviour. */
  readonly capabilities?: {
    /**
     * true where changing a prop re-invokes the hook on the same element, running the previous
     * cleanup first, instead of leaving the registration alone. Solid does this today: its
     * `<Dynamic {...domProps()} ref>` spread re-applies `ref` whenever the props memo recomputes.
     * The suite still requires that nothing leaks — one `close` listener, not two.
     */
    readonly hookReRunsOnPropChange?: boolean
  }
}

/**
 * `onElement` parity suite. Verifies that every adapter hands the hook the real host element,
 * that `getProps()` tracks the current props without the hook being re-registered, that the
 * returned cleanup runs when the component is torn down, and that components without the option
 * are unaffected.
 *
 * Lifecycle edge cases that depend on swapping the host element (`as` changes, throwing hooks)
 * are not shared — they exercise each adapter's own ref/registration mechanics — and stay in the
 * adapter test files, as do assertions about a native host such as `<dialog>`.
 */
export function onElementSuite(adapter: OnElementAdapter): void {
  describe('onElement (event-handler wiring)', () => {
    it('receives the real element', async () => {
      let received: Element | undefined
      const mounted = await adapter.mount((element) => {
        received = element
      })

      expect(received).toBe(mounted.element)
    })

    it('getProps() reflects current props without re-registering the listener', async () => {
      let attachCount = 0
      const seen: unknown[] = []
      const mounted = await adapter.mount((element, getProps) => {
        const onClose = () => seen.push(getProps()['label'])
        element.addEventListener('close', onClose)
        attachCount++
        return () => element.removeEventListener('close', onClose)
      }, 'first')

      mounted.element.dispatchEvent(new Event('close'))
      expect(seen).toEqual(['first'])

      // Same element, new props — the hook must not fire again, yet getProps() sees the update.
      await mounted.setLabel('second')
      expect(attachCount).toBe(adapter.capabilities?.hookReRunsOnPropChange ? 2 : 1)
      mounted.element.dispatchEvent(new Event('close'))
      expect(seen).toEqual(['first', 'second'])
    })

    it('runs the returned cleanup on unmount', async () => {
      const cleanup = vi.fn()
      const mounted = await adapter.mount(() => cleanup)

      expect(cleanup).not.toHaveBeenCalled()
      await mounted.unmount()
      expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it('a plain component with no onElement option is unaffected', async () => {
      await adapter.mountPlain()
    })
  })
}
