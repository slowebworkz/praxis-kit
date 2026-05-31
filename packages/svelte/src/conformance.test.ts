// @vitest-environment jsdom
import { render, cleanup } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { conformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceComponent,
} from '@praxis-ui/adapter-utils/testing'
import Polymorphic from './Polymorphic.svelte'
import { createContractComponent } from './create-contract-component'
import type { AnyBuiltRuntime } from './types/built-runtime'

type SvelteComponent = ConformanceComponent & { _bundle: AnyBuiltRuntime }

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function childSpecToHTML(specs: ChildSpec[]): string {
  return specs
    .map((c) => {
      if ('component' in c)
        throw new Error('Svelte conformance adapter does not support component ChildSpec nodes')
      const attrs = Object.entries(c.props ?? {})
        .map(([k, v]) => `${k}="${escapeAttr(String(v))}"`)
        .join(' ')
      const inner = c.children ? childSpecToHTML(c.children) : ''
      return `<${c.tag}${attrs ? ' ' + attrs : ''}>${inner}</${c.tag}>`
    })
    .join('')
}

conformanceSuite({
  createComponent: (options): ConformanceComponent => {
    const bundle = createContractComponent(options as BareFactoryOptions) as AnyBuiltRuntime
    const comp: SvelteComponent = {
      displayName: options.name ?? 'PolymorphicComponent',
      _bundle: bundle,
    }
    return comp
  },
  render: (component, props = {}, children = []) => {
    const { _bundle: bundle } = component as SvelteComponent
    const { class: cls, ...rest } = props

    const snippetChildren =
      children.length > 0
        ? createRawSnippet(() => ({ render: () => childSpecToHTML(children) }))
        : undefined

    const baseProps = {
      bundle,
      ...(cls !== undefined && { class: cls }),
      ...rest,
      ...(snippetChildren !== undefined && { children: snippetChildren }),
    }

    if (process.env.NODE_ENV !== 'production') {
      bundle.childrenEvaluator?.evaluate(children)
    }

    const result = render(Polymorphic, baseProps as never)

    return {
      get element() {
        return result.container.firstElementChild as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        const { class: newCls, ...newRest } = newProps
        const newSnippet =
          newChildren.length > 0
            ? createRawSnippet(() => ({ render: () => childSpecToHTML(newChildren) }))
            : undefined
        result.rerender({
          bundle,
          ...(newCls !== undefined && { class: newCls }),
          ...newRest,
          ...(newSnippet !== undefined && { children: newSnippet }),
        } as never)
      },
      unmount() {
        result.unmount()
      },
    }
  },
  setup: () => {},
  cleanup: () => cleanup(),
  capabilities: { asChild: false },
})
