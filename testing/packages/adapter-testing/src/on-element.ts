import { describe, expect, it, vi } from 'vitest'
import type { AnyRecord } from '@praxis-kit/core'
import { tagOf } from './helpers'

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

/** A mounted component whose host element type can be changed through `as`. */
export type OnElementSwappable = {
  /**
   * Change the `as` prop to `tag`, replacing the host element. Throws, or returns a promise that
   * rejects, if the `onElement` hook throws while registering against the replacement.
   */
  readonly setHost: (tag: string) => void | Promise<void>
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
  /**
   * Mount a `div` component with `as: 'section'` and the given hook. Omit it for adapters whose
   * host element cannot change (custom elements), which skips the host-replacement scenarios.
   */
  readonly mountSwappable?: (
    hook: OnElementHook,
  ) => OnElementSwappable | Promise<OnElementSwappable>
}

/**
 * `onElement` parity suite. Verifies that every adapter hands the hook the real host element,
 * that `getProps()` tracks the current props without the hook being re-registered, that the
 * returned cleanup runs when the component is torn down, and that components without the option
 * are unaffected.
 *
 * The lifecycle scenarios cover what a registration owes the host element: cleanup runs exactly
 * once however many updates came first, a hook may return nothing, and — for adapters that can
 * swap the host through `as` — the previous cleanup runs before the replacement registers, and a
 * hook that throws on the replacement does not leave a stale cleanup to run again on unmount.
 * Assertions about a native host such as `<dialog>`, and how a framework reaches the element
 * (Vue's `asChild` slot), stay in the adapter test files.
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
      expect(attachCount).toBe(1)
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

  describe('onElement (lifecycle)', () => {
    it('runs the cleanup exactly once on unmount, however many updates came first', async () => {
      const cleanup = vi.fn()
      const mounted = await adapter.mount(() => cleanup, 'first')

      await mounted.setLabel('second')
      await mounted.setLabel('third')
      expect(cleanup).not.toHaveBeenCalled()

      await mounted.unmount()
      expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it('tolerates a hook that returns nothing', async () => {
      const mounted = await adapter.mount(() => {})
      await mounted.setLabel('updated')
      await expect(Promise.resolve(mounted.unmount())).resolves.toBeUndefined()
    })

    const { mountSwappable } = adapter
    if (mountSwappable === undefined) return

    it('runs the previous cleanup before registering against a replacement element', async () => {
      const log: string[] = []
      const mounted = await mountSwappable((element) => {
        const tag = tagOf(element)
        log.push(`register:${tag}`)
        return () => log.push(`cleanup:${tag}`)
      })

      await mounted.setHost('article')

      expect(log).toEqual(['register:section', 'cleanup:section', 'register:article'])
    })

    it('does not re-run a spent cleanup when the hook throws on the replacement element', async () => {
      const firstCleanup = vi.fn()
      let calls = 0
      const mounted = await mountSwappable(() => {
        calls += 1
        if (calls === 1) return firstCleanup
        throw new Error('onElement failed on the replacement element')
      })

      // Sync throw and rejected promise are both "the hook failed"; the previous cleanup has
      // already run and been cleared, so unmounting must not run it a second time.
      await expect((async () => mounted.setHost('article'))()).rejects.toThrow('onElement failed')
      expect(firstCleanup).toHaveBeenCalledTimes(1)

      await mounted.unmount()
      expect(firstCleanup).toHaveBeenCalledTimes(1)
    })
  })
}
