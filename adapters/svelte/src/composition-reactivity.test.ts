// @vitest-environment jsdom
/**
 * Composition must stay reactive after mount: a changed variant prop re-resolves the combined
 * class, and a changed forwarded prop reaches the rendered element. Like
 * `asChild-reactivity.test.ts`, this needs a real `$state` host rather than `rerender()`.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { tick } from 'svelte'
import Host from './composition-reactivity.test-host.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

function build(asPartner: (b: object) => object) {
  const surface = createContractComponent({
    tag: 'div',
    styling: {
      variants: {
        intent: { ghost: 'partner-ghost', solid: 'partner-solid' },
        tone: { quiet: 'partner-quiet', loud: 'partner-loud' },
      },
    },
  })
  return createContractComponent({
    tag: 'div',
    compose: { with: asPartner(surface) as never, allProps: true },
    styling: { variants: { intent: { ghost: 'primary-ghost', solid: 'primary-solid' } } },
  } as never)
}

describe.each([
  ['Praxis partner (combined path)', (b: object) => b],
  ['partner without retained metadata (fallback path)', (b: object) => ({ ...b })],
])('composition reactivity — %s', (_label, asPartner) => {
  it('re-resolves the primary variant class when the variant prop changes', async () => {
    const { container, component } = render(Host, { props: { bundle: build(asPartner) } })
    const className = (): string => container.querySelector('div')!.className

    expect(className()).toContain('primary-ghost')

    component.setIntent('solid')
    await tick()

    expect(className()).toContain('primary-solid')
    expect(className()).not.toContain('primary-ghost')
  })

  it('re-resolves the partner’s contribution when a forwarded partner-only variant changes', async () => {
    // allProps: true forwards `tone` to the partner; the partner's own class output depends on
    // it, so this proves forwarding stays reactive (not just ordinary DOM prop reactivity).
    const { container, component } = render(Host, { props: { bundle: build(asPartner) } })
    const className = (): string => container.querySelector('div')!.className

    expect(className()).toContain('partner-quiet')

    component.setTone('loud')
    await tick()

    expect(className()).toContain('partner-loud')
    expect(className()).not.toContain('partner-quiet')
  })

  it('updates the composing component’s own DOM attribute', async () => {
    const { container, component } = render(Host, { props: { bundle: build(asPartner) } })
    const probe = (): string | null => container.querySelector('div')!.getAttribute('data-probe')

    expect(probe()).toBe('one')

    component.setProbe('two')
    await tick()

    expect(probe()).toBe('two')
  })
})

describe('composition reactivity — combined path', () => {
  it('also updates the partner’s contribution for a shared variant', async () => {
    const { container, component } = render(Host, { props: { bundle: build((b) => b) } })
    const className = (): string => container.querySelector('div')!.className

    expect(className()).toContain('partner-ghost')

    component.setIntent('solid')
    await tick()

    expect(className()).toContain('partner-solid')
    expect(className()).not.toContain('partner-ghost')
  })
})
