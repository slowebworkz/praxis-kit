// @vitest-environment jsdom
/**
 * DOM lifecycle across a tag switch: `onElement` must clean up for the old element and be called
 * once for its replacement, and the (dev-only) child evaluator must read the live host's children,
 * not stale nodes from the element that was replaced.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { tick } from 'svelte'
import Host from './tag-switch.test-host.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

describe('tag switch lifecycle', () => {
  it('runs the onElement cleanup for the old element and registers the replacement once', async () => {
    const cleanups: string[] = []
    const registered: string[] = []
    const bundle = createContractComponent({
      tag: 'div',
      onElement: (el) => {
        registered.push(el.tagName.toLowerCase())
        return () => cleanups.push(el.tagName.toLowerCase())
      },
    })

    const { component, unmount } = render(Host, { props: { bundle } })
    expect(registered).toEqual(['div'])
    expect(cleanups).toEqual([])

    component.setTag('section')
    await tick()

    expect(registered).toEqual(['div', 'section'])
    expect(cleanups).toEqual(['div'])

    unmount()
    expect(cleanups).toEqual(['div', 'section'])
  })

  it('evaluates children against the live host element after the tag changes', async () => {
    const bundle = createContractComponent({ tag: 'div' })
    const evaluate = vi.fn()
    // The evaluator is optional on a bundle without child rules; install a recording one.
    ;(bundle as { childrenEvaluator?: unknown }).childrenEvaluator = { evaluate }

    const { component, container } = render(Host, { props: { bundle } })
    component.setTag('section')
    await tick()

    const lastCall = evaluate.mock.calls.at(-1)
    expect(lastCall).toBeDefined()
    const nodes = lastCall![0] as Node[]
    const live = container.querySelector('section')!
    expect(nodes.length).toBeGreaterThan(0)
    for (const node of nodes) expect(node.parentNode).toBe(live)
  })
})
