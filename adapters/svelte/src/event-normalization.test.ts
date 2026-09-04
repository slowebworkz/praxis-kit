// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import Polymorphic from './Polymorphic.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

// Svelte 5 requires lowercase handler names (onclick, not onClick) for its own event delegation.
// Polymorphic.svelte's normalizeEventKeys lowercases a camelCase `onXxx` key so a bundle's caller
// can write React-style handler names — a deliberate compatibility feature, not an accident of the
// regex (see its own comment). This matrix pins the exact, narrow contract: what it does, and,
// just as importantly, what it does not — because Svelte's own attribute-spreading runtime treats
// *any* "on"-prefixed key as event-related independent of this function.

describe('event-key normalization — camelCase handlers bind as native listeners', () => {
  it.each([
    ['onClick', 'click'],
    ['onKeyDown', 'keydown'],
    ['onPointerDown', 'pointerdown'],
    ['onMouseEnter', 'mouseenter'],
  ])('%s fires on the native %s event', (prop, event) => {
    const handler = vi.fn()
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, [prop]: handler })
    container.querySelector('div')!.dispatchEvent(new Event(event, { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('event-key normalization — already-lowercase handlers are untouched', () => {
  it('onclick (no camelCase to normalize) still fires on click', () => {
    const handler = vi.fn()
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, onclick: handler })
    container.querySelector('div')!.dispatchEvent(new Event('click', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('event-key normalization — a component-level "on" name is still treated as an event', () => {
  it('onCustomThing is bound as a listener for the literal lowercased (synthetic) event name', () => {
    const handler = vi.fn()
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, onCustomThing: handler })
    const el = container.querySelector('div')!
    // Not rendered as a literal HTML attribute — bound via addEventListener like any other
    // normalized "on" key.
    expect(el.hasAttribute('oncustomthing')).toBe(false)
    el.dispatchEvent(new CustomEvent('customthing', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('onValueChange (a plausible component "callback prop" name) is not invoked as a plain callback', () => {
    // There is no separate "custom callback prop" convention this adapter recognizes — every
    // "on"-prefixed prop is treated as a DOM event, whether or not "ValueChange" is a real one.
    // A caller who wants a component-level callback must name it without an "on" prefix.
    const handler = vi.fn()
    const bundle = createContractComponent({ tag: 'div' })
    render(Polymorphic, { bundle, onValueChange: handler })
    // The handler is never called directly — it only fires if something dispatches a
    // "valuechange" CustomEvent, which nothing in this adapter does.
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('event-key normalization — non-camelCase "on"-prefixed keys are dropped by Svelte itself', () => {
  it.each([['once'], ['on-value']])(
    '%s (starts with "on", no camelCase to normalize, non-function value) is not rendered as an attribute',
    (key) => {
      // normalizeEventKeys passes these through unchanged (EVENT_RE doesn't match them — no
      // uppercase letter follows "on"), but Svelte's own <svelte:element> spread runtime still
      // recognizes the literal "on" prefix and silently drops a non-function value rather than
      // rendering it as a plain attribute. This is a Svelte-runtime fact, not something
      // normalizeEventKeys controls — pinned here so a future change to the function doesn't get
      // credited (or blamed) for behavior it was never responsible for.
      const bundle = createContractComponent({ tag: 'div' })
      const { container } = render(Polymorphic, { bundle, [key]: 'marker-value' })
      const el = container.querySelector('div')!
      expect(el.getAttribute(key)).toBeNull()
    },
  )
})

describe('event-key normalization — unrelated keys are unaffected', () => {
  it('a data-* attribute passes through unchanged', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, 'data-testid': 'box' })
    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('an arbitrary non-"on" key passes through unchanged', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, foo: 'marker-value' })
    expect(container.querySelector('div')?.getAttribute('foo')).toBe('marker-value')
  })
})
