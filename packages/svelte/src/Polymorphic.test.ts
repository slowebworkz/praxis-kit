// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import Polymorphic from './Polymorphic.svelte'
import { createPolymorphicComponent } from './create-polymorphic-component'

afterEach(cleanup)

describe('Polymorphic (Svelte adapter)', () => {
  it('renders the default tag', () => {
    const bundle = createPolymorphicComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle })
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const bundle = createPolymorphicComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, as: 'section' })
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies base class', () => {
    const bundle = createPolymorphicComponent({ tag: 'div', styling: { base: 'base-class' } })
    const { container } = render(Polymorphic, { bundle })
    expect(container.querySelector('div')?.className).toBe('base-class')
  })

  it('merges caller class with base', () => {
    const bundle = createPolymorphicComponent({ tag: 'div', styling: { base: 'base' } })
    const { container } = render(Polymorphic, { bundle, class: 'caller' })
    const cls = container.querySelector('div')?.className
    expect(cls).toContain('base')
    expect(cls).toContain('caller')
  })

  it('passes extra props to the DOM element', () => {
    const bundle = createPolymorphicComponent({ tag: 'div' })
    const { container } = render(Polymorphic, { bundle, 'data-testid': 'box' })
    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('strips redundant ARIA role from intrinsic element', () => {
    const bundle = createPolymorphicComponent({ tag: 'button', enforcement: { strict: false } })
    const { container } = render(Polymorphic, { bundle, role: 'button' })
    expect(container.querySelector('button')?.getAttribute('role')).toBeNull()
  })

  it('applies variant classes', () => {
    const bundle = createPolymorphicComponent({
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
    const bundle = createPolymorphicComponent({
      tag: 'div',
      filterProps: (key) => key === 'myProp',
    })
    const { container } = render(Polymorphic, { bundle, myProp: 'should-be-stripped' })
    expect(container.querySelector('[myProp]')).toBeNull()
    expect(container.querySelector('[myprop]')).toBeNull()
  })
})
