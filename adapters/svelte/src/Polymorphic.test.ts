// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { silentDiagnostics, throwDiagnostics } from '@praxis-kit/diagnostics'
import Polymorphic from './Polymorphic.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

describe('Polymorphic (Svelte adapter)', () => {
  it('renders the default tag', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle })
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, as: 'section' })
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies base class', () => {
    const bundle = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
    const { container } = render(Polymorphic, { bundle })
    expect(container.querySelector('div')?.className).toBe('base-class')
  })

  it('merges caller class with base', () => {
    const bundle = createContractComponent({ tag: 'div', styling: { base: 'base' } })
    const { container } = render(Polymorphic, { bundle, class: 'caller' })
    const cls = container.querySelector('div')?.className
    expect(cls).toContain('base')
    expect(cls).toContain('caller')
  })

  it('passes extra props to the DOM element', () => {
    const bundle = createContractComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, 'data-testid': 'box' })
    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('strips redundant ARIA role from intrinsic element', () => {
    const bundle = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const { container } = render(Polymorphic, { bundle, role: 'button' })
    expect(container.querySelector('button')?.getAttribute('role')).toBeNull()
  })

  it('applies variant classes', () => {
    const bundle = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { size: { sm: 'box--sm', lg: 'box--lg' } },
      },
    })
    const { container } = render(Polymorphic, { bundle, size: 'sm' })
    expect(container.querySelector('div')?.className).toContain('box--sm')
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const bundle = createContractComponent({
      tag: 'div',
      filterProps: (key) => key === 'myProp',
    })
    const { container } = render(Polymorphic, { bundle, myProp: 'should-be-stripped' })
    expect(container.querySelector('[myProp]')).toBeNull()
    expect(container.querySelector('[myprop]')).toBeNull()
  })

  describe('asChild', () => {
    it('renders the slot snippet instead of the host element', () => {
      const bundle = createContractComponent({ tag: 'div' })
      const children = createRawSnippet<[Record<string, unknown>]>(() => ({
        render: () => '<a href="/home">Home</a>',
      }))
      const { container } = render(Polymorphic, { bundle, asChild: true, children })
      expect(container.querySelector('a')).toBeTruthy()
      expect(container.querySelector('div')).toBeNull()
    })

    it('forwards class and props to the slot snippet', () => {
      const bundle = createContractComponent({ tag: 'div', styling: { base: 'base-class' } })
      let receivedProps: Record<string, unknown> = {}
      const children = createRawSnippet<[Record<string, unknown>]>((getProps) => ({
        render() {
          receivedProps = getProps()
          return `<a>link</a>`
        },
      }))
      render(Polymorphic, { bundle, asChild: true, children, 'data-extra': 'yes' })
      expect(receivedProps['class']).toContain('base-class')
      expect(receivedProps['data-extra']).toBe('yes')
    })

    it('falls back to normal render when asChild is false', () => {
      const bundle = createContractComponent({ tag: 'section' })
      // Without asChild, host element is preserved and snippet renders inside it
      const children = createRawSnippet(() => ({
        render: () => '<span>text</span>',
      }))
      const { container } = render(Polymorphic, { bundle, asChild: false, children })
      expect(container.querySelector('section')).toBeTruthy()
      expect(container.querySelector('section > span')).toBeTruthy()
    })

    it('throws when as and asChild are both set (strict: throw)', () => {
      const bundle = createContractComponent({
        tag: 'div',
        enforcement: { diagnostics: throwDiagnostics },
      })
      const children = createRawSnippet<[Record<string, unknown>]>(() => ({
        render: () => '<a>link</a>',
      }))
      expect(() => render(Polymorphic, { bundle, asChild: true, as: 'span', children })).toThrow()
    })
  })
})
