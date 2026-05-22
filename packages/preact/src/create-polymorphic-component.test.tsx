// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { h, Fragment, createRef } from 'preact'
import { render } from 'preact'
import type { ComponentType } from 'preact'
import type { AnyVNode, UnknownProps } from './types'
import { createPolymorphicComponent } from './create-polymorphic-component'

// Cast to bypass the PolymorphicComponent union in h() overloads.
function box(comp: { displayName?: string }): ComponentType<UnknownProps> {
  return comp as unknown as ComponentType<UnknownProps>
}

let container: HTMLElement

function mount(element: AnyVNode) {
  render(element, container)
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  render(null, container)
  document.body.removeChild(container)
})

describe('createPolymorphicComponent (Preact adapter)', () => {
  it('sets displayName', () => {
    const Comp = createPolymorphicComponent({ name: 'MyBox' })

    expect(Comp.displayName).toBe('MyBox')
  })

  it('falls back to PolymorphicComponent displayName', () => {
    const Comp = createPolymorphicComponent({})

    expect(Comp.displayName).toBe('PolymorphicComponent')
  })

  it('renders the default tag (div)', () => {
    const Box = createPolymorphicComponent({})

    mount(h(box(Box), null))

    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createPolymorphicComponent({})

    mount(h(box(Box), { as: 'section' }))

    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies base class', () => {
    const Box = createPolymorphicComponent({
      styling: { base: 'base-cls' },
    })

    mount(h(box(Box), null))

    expect(container.querySelector('div')!.className).toBe('base-cls')
  })

  it('merges caller className with base', () => {
    const Box = createPolymorphicComponent({
      styling: { base: 'base' },
    })

    mount(h(box(Box), { className: 'extra' }))

    const cls = container.querySelector('div')!.className

    expect(cls).toContain('base')
    expect(cls).toContain('extra')
  })

  it('forwards a ref to the DOM element', () => {
    const Box = createPolymorphicComponent({})
    const ref = createRef<HTMLDivElement>()

    mount(h(box(Box), { ref }))

    expect(ref.current).toBe(container.querySelector('div'))
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Box = createPolymorphicComponent({})
    const ref = createRef<HTMLButtonElement>()

    mount(h(box(Box), { as: 'button', ref }))

    expect(ref.current).toBe(container.querySelector('button'))
  })

  it('passes extra props to the DOM element', () => {
    const Box = createPolymorphicComponent({})

    mount(h(box(Box), { 'data-testid': 'box' }))

    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createPolymorphicComponent({})

    mount(h(box(Box), null, h('span', { id: 'child' })))

    expect(container.querySelector('span#child')).toBeTruthy()
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createPolymorphicComponent({})

    mount(h(box(Box), { asChild: true }, h('button', { type: 'button' })))

    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createPolymorphicComponent({
      styling: { base: 'box-cls' },
    })

    mount(h(box(Box), { asChild: true }, h('button', null)))

    expect(container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createPolymorphicComponent({})

    expect(() =>
      mount(
        h(box(Box), {
          asChild: true,
        }),
      ),
    ).toThrow('asChild requires exactly one Preact element child, got 0')
  })

  it('fragment child counts as one element for asChild (no flattening)', () => {
    const Box = createPolymorphicComponent({})

    const fragment = h(Fragment, null, h('span', null))

    expect(() => mount(h(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createPolymorphicComponent({
      styling: { base: 'class-a' },
    })

    const BoxB = createPolymorphicComponent({
      styling: { base: 'class-b' },
    })

    mount(h(box(BoxA), { asChild: true }, h(box(BoxB), { asChild: true }, h('button', null))))

    const el = container.querySelector('button')!

    expect(el.className).toContain('class-a')
    expect(el.className).toContain('class-b')
  })

  it('nested asChild: ref from outer component reaches the innermost element', () => {
    const BoxA = createPolymorphicComponent({})
    const BoxB = createPolymorphicComponent({})
    const ref = createRef<HTMLButtonElement>()

    mount(h(box(BoxA), { asChild: true, ref }, h(box(BoxB), { asChild: true }, h('button', null))))

    expect(ref.current).toBe(container.querySelector('button'))
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createPolymorphicComponent({
      filterProps: (key: string) => key === 'size',
    })

    mount(
      h(box(Box), {
        size: 'lg',
        'data-keep': 'yes',
      } as never),
    )

    const el = container.querySelector('div')!

    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })

  it('strips redundant ARIA role from intrinsic element', () => {
    const Nav = createPolymorphicComponent({
      tag: 'nav',
      enforcement: { strict: false },
    })

    mount(h(box(Nav), { role: 'navigation' } as never))

    expect(container.querySelector('nav')!.getAttribute('role')).toBeNull()
  })

  it('applies variant classes', () => {
    const Box = createPolymorphicComponent({
      tag: 'div',
      styling: {
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        defaults: { size: 'lg' },
      },
    })

    mount(h(box(Box), null))

    expect(container.querySelector('div')!.className).toContain('text-lg')
  })

  it('enforcement.children throws when child rules are violated', () => {
    const Group = createPolymorphicComponent({
      tag: 'div',
      enforcement: {
        strict: 'throw',
        children: [
          {
            name: 'Button',
            match: (c: unknown): c is unknown => (c as { type?: unknown }).type === 'button',
            cardinality: { min: 1, max: 3 },
          },
        ],
      },
    })

    expect(() => mount(h(box(Group), null, h('span', null)))).toThrow()
  })
})
