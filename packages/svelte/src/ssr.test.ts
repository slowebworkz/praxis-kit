// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { ssrConformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { BareFactoryOptions, ConformanceComponent } from '@praxis-ui/adapter-utils/testing'
import Polymorphic from './Polymorphic.svelte'
import { createContractComponent } from './create-contract-component'
import type { AnyBuiltRuntime } from './types/built-runtime'

type SvelteSSRComponent = ConformanceComponent & { _bundle: AnyBuiltRuntime }

describe('Polymorphic — SSR (svelte/server render)', () => {
  it('renders to HTML without accessing browser globals', () => {
    const bundle = createContractComponent({ tag: 'div' })
    expect(() => render(Polymorphic, { props: { bundle } })).not.toThrow()
  })

  it('applies base class in server-rendered HTML', () => {
    const bundle = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
    const { html } = render(Polymorphic, { props: { bundle } })
    expect(html).toContain('base-class')
  })

  it('strips redundant ARIA role in server-rendered HTML', () => {
    const bundle = createContractComponent({ tag: 'button', enforcement: { strict: false } })
    const { html } = render(Polymorphic, { props: { bundle, role: 'button' } })
    expect(html).not.toContain('role=')
  })

  it('applies variant class in server-rendered HTML', () => {
    const bundle = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { intent: { primary: 'box--primary' } },
      },
    })
    const { html } = render(Polymorphic, { props: { bundle, intent: 'primary' } })
    expect(html).toContain('box--primary')
  })

  it('as prop overrides the default tag in server-rendered HTML', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { html } = render(Polymorphic, { props: { bundle, as: 'section' } })
    expect(html).toContain('<section')
    expect(html).not.toContain('<div')
  })
})

ssrConformanceSuite<SvelteSSRComponent>({
  createComponent: (options): SvelteSSRComponent => ({
    displayName: options.name ?? 'PolymorphicComponent',
    _bundle: createContractComponent(options as BareFactoryOptions) as AnyBuiltRuntime,
  }),
  renderToString: (component, props = {}) => {
    const { html } = render(Polymorphic, {
      props: { bundle: component._bundle, ...props },
    } as never)
    return html
  },
})
