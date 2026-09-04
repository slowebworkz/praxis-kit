// @vitest-environment jsdom
/**
 * `@testing-library/svelte`'s `rerender()` combined with `createRawSnippet` (used by every other
 * asChild test in `Polymorphic.test.ts`) cannot prove reactivity: `createRawSnippet`'s params are
 * captured once at setup and are documented by Svelte itself as non-reactive — a testing-helper
 * limitation, not a fact about `Polymorphic.svelte`. Proving the asChild path actually reacts to a
 * resolved-prop change needs a real `$state`-driven host and a real `{#snippet}` block, which is
 * what `asChild-reactivity.spike-host.svelte` is: it owns its own `class` in `$state` and exposes
 * `setExtra` as a component export, callable via the `component` testing-library gives back.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { tick } from 'svelte'
import Host from './asChild-reactivity.spike-host.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

describe('asChild reactivity (real $state host, not createRawSnippet)', () => {
  it('the slot snippet re-renders with the new resolved class when a $state prop changes', async () => {
    const bundle = createContractComponent({ tag: 'div', styling: { base: 'base' } })
    const { container, component } = render(Host, { props: { bundle } })

    const target = (): Element | null => container.querySelector('[data-testid="target"]')
    expect(target()?.className.split(/\s+/)).toEqual(expect.arrayContaining(['base', 'a']))

    component.setExtra('b')
    await tick()

    const classes = target()?.className.split(/\s+/) ?? []
    expect(classes).toContain('b')
    expect(classes).not.toContain('a')
  })
})
