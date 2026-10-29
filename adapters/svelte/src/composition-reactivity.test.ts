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
import OwnedPropHost from './composition-owned-prop-reactivity.test-host.svelte'
import TailwindDisplayParityHost from './tailwind-display-parity.test-host.svelte'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import { tailwindDisplayParitySuite } from '@praxis-kit/adapter-utils/testing'
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

describe('composition reactivity — plugin-owned props', () => {
  it('updates partner-selected Tailwind classes when flex changes after mount', async () => {
    const surface = createContractComponent({
      tag: 'div',
      styling: { base: 'grid-cols-3 gap-4', plugin: createTailwindPipeline },
    })
    const card = createContractComponent({
      tag: 'div',
      compose: { with: surface as never },
      styling: { base: 'rounded' },
    } as never)
    const { container, component } = render(OwnedPropHost, { props: { bundle: card } })
    const element = container.querySelector('div')!

    // Without a display prop the Tailwind plugin drops container utilities (`grid-cols-3`,
    // `gap-4`); `flex` selects the flex family, which keeps `gap-4` and still drops `grid-cols-3`.
    expect(element.className).toContain('rounded')
    expect(element.className).not.toContain('flex')
    expect(element.className).not.toContain('gap-4')

    component.setFlex(true)
    await tick()

    expect(container.querySelector('div')).toBe(element)
    expect(element.className).toContain('flex')
    expect(element.className).toContain('gap-4')
    expect(element.className).not.toContain('grid-cols-3')

    component.setFlex(false)
    await tick()

    expect(element.className).not.toContain('flex')
    expect(element.className).not.toContain('gap-4')
    expect(element.className).toContain('rounded')
  })
})

tailwindDisplayParitySuite({
  renderers: {
    props: async ({ flex, layout, className }) => {
      const Box = createContractComponent({
        tag: 'div',
        styling: { base: 'base', plugin: createTailwindPipeline },
      })
      const { container } = render(TailwindDisplayParityHost, {
        props: { bundle: Box, className, layout, flex },
      })
      await tick()
      return container.querySelector('div')!.className
    },
  },
})
