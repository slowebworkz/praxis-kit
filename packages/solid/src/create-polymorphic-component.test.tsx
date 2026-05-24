// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { createPolymorphicComponent } from './create-polymorphic-component'

afterEach(cleanup)

describe('createPolymorphicComponent (Solid adapter)', () => {
  it('sets displayName', () => {
    const Comp = createPolymorphicComponent({ name: 'MyBox', tag: 'div' })
    expect(Comp.displayName).toBe('MyBox')
  })

  it('falls back to PolymorphicComponent displayName', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    expect(Comp.displayName).toBe('PolymorphicComponent')
  })

  it('renders the default tag', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    const { container } = solidRender(() => <Comp />)
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    const { container } = solidRender(() => <Comp as="section" />)
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies base class', () => {
    const Comp = createPolymorphicComponent({ tag: 'div', styling: { base: 'base-class' } })
    const { container } = solidRender(() => <Comp />)
    expect(container.querySelector('div')?.className).toBe('base-class')
  })

  it('merges caller class with base', () => {
    const Comp = createPolymorphicComponent({ tag: 'div', styling: { base: 'base' } })
    const { container } = solidRender(() => <Comp class="caller" />)
    expect(container.querySelector('div')?.className).toContain('base')
    expect(container.querySelector('div')?.className).toContain('caller')
  })

  it('forwards a ref to the DOM element', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    let el: HTMLDivElement | undefined
    solidRender(() => (
      <Comp
        ref={(e: HTMLDivElement) => {
          el = e
        }}
      />
    ))
    expect(el).toBeInstanceOf(HTMLDivElement)
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    let el: HTMLButtonElement | undefined
    solidRender(() => (
      <Comp
        as="button"
        ref={(e: HTMLButtonElement) => {
          el = e
        }}
      />
    ))
    expect(el).toBeInstanceOf(HTMLButtonElement)
  })

  it('passes extra props to the DOM element', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    const { container } = solidRender(() => <Comp data-testid="box" />)
    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    const { getByText } = solidRender(() => <Comp>hello</Comp>)
    expect(getByText('hello')).toBeTruthy()
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Comp = createPolymorphicComponent({
      tag: 'div',
      filterProps: (key) => key === 'myProp',
    })
    const { container } = solidRender(() => <Comp myProp="should-be-stripped" />)
    expect(container.querySelector('[myProp]')).toBeNull()
    expect(container.querySelector('[myprop]')).toBeNull()
  })

  it('strips redundant ARIA role from intrinsic element', () => {
    const Comp = createPolymorphicComponent({ tag: 'button', enforcement: { strict: false } })
    const { container } = solidRender(() => <Comp role="button" />)
    // button has an implicit role="button" — redundant role should be stripped
    expect(container.querySelector('button')?.getAttribute('role')).toBeNull()
  })

  it('applies variant classes', () => {
    const Comp = createPolymorphicComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { size: { sm: 'box--sm', lg: 'box--lg' } },
      },
    })
    const { container } = solidRender(() => <Comp size="sm" />)
    expect(container.querySelector('div')?.className).toContain('box--sm')
  })

  it('reacts to signal-driven as prop change', () => {
    const Comp = createPolymorphicComponent({ tag: 'div' })
    const [tag, setTag] = createSignal<'div' | 'section'>('div')
    const { container } = solidRender(() => <Comp as={tag()} />)
    expect(container.querySelector('div')).toBeTruthy()
    setTag('section')
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('reacts to signal-driven class change', () => {
    const Comp = createPolymorphicComponent({ tag: 'div', styling: { base: 'base' } })
    const [extra, setExtra] = createSignal('a')
    const { container } = solidRender(() => <Comp class={extra()} />)
    expect(container.querySelector('div')?.className).toContain('a')
    setExtra('b')
    expect(container.querySelector('div')?.className).toContain('b')
    expect(container.querySelector('div')?.className).not.toContain(' a')
  })

  it('enforcement.children throws when child rules are violated', () => {
    const Comp = createPolymorphicComponent({
      tag: 'div',
      enforcement: {
        children: [
          { name: 'Button', match: (c): c is Element => (c as Element)?.tagName === 'BUTTON' },
        ],
      },
    })
    expect(() =>
      solidRender(() => (
        <Comp>
          <span>not a button</span>
        </Comp>
      )),
    ).toThrow()
  })
})
