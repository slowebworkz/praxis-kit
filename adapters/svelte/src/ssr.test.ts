// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { render } from 'svelte/server'
import { ssrConformanceSuite } from '@praxis-kit/adapter-utils/testing'
import type { BareFactoryOptions, ConformanceComponent } from '@praxis-kit/adapter-utils/testing'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
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
    const bundle = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
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

  // Polymorphic.svelte gates both $effects (onElement, the dev-only children/HTML evaluators)
  // behind `typeof document !== 'undefined'` — merely *registering* an $effect during
  // svelte/server's render() throws ("effect_orphan"), so the guard must skip the whole
  // registration, not just no-op inside the callback. These two tests prove that guard actually
  // holds at the observable-behavior level: neither runtime feature fires during SSR, not just
  // "SSR doesn't throw" (the earlier test in this file already covers that).
  it('onElement is not called during SSR — it is a DOM-only lifecycle feature', () => {
    const onElement = vi.fn((): void => {})
    const bundle = createContractComponent({
      tag: 'dialog',
      onElement,
      enforcement: { diagnostics: silentDiagnostics },
    })
    render(Polymorphic, { props: { bundle } })
    expect(onElement).not.toHaveBeenCalled()
  })

  it('the children evaluator is not invoked during SSR — it is a dev-only DOM diagnostic', () => {
    const bundle = createContractComponent({
      tag: 'div',
      enforcement: {
        diagnostics: silentDiagnostics,
        children: [{ name: 'Foo', match: (c: unknown): c is Element => c instanceof Element }],
      },
    })
    const evaluateSpy = bundle.childrenEvaluator && vi.spyOn(bundle.childrenEvaluator, 'evaluate')
    expect(bundle.childrenEvaluator).toBeDefined()
    render(Polymorphic, { props: { bundle } })
    expect(evaluateSpy).not.toHaveBeenCalled()
  })
})

// Note on client hydration: this file proves SSR output is correct and that DOM-only lifecycle
// features (onElement, children evaluation) stay inert on the server. It does not prove a
// hydration *transition* — mounting client-side over already-server-rendered markup and confirming
// no mismatch/flash — the way adapters/solid's hydration-parity.test.tsx does. `../pk` doesn't have
// one for Svelte either; a real one would need to render server-side, feed that markup to a jsdom
// container, then `mount()` (not `render()`) Polymorphic over it. Recorded as a gap, not silently
// assumed covered — see DECISIONS.md.

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
