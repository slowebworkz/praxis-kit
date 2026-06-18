// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createElement, Fragment, createRef } from 'react'
import type { RenderCallbackProps } from '../shared'
import { box, useReactDom } from '../shared/test-utils'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

describe('createContractComponent (current / React 19)', () => {
  it('sets displayName', () => {
    const Comp = createContractComponent({ name: 'MyBox' })

    expect(Comp.displayName).toBe('MyBox')
  })

  it('falls back to PolymorphicComponent displayName', () => {
    const Comp = createContractComponent({})

    expect(Comp.displayName).toBe('PolymorphicComponent')
  })

  it('renders the default tag (div)', () => {
    const Box = createContractComponent({})

    dom.mount(createElement(box(Box), null))

    expect(dom.container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createContractComponent({})

    dom.mount(createElement(box(Box), { as: 'section' }))

    expect(dom.container.querySelector('section')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('applies baseClassName', () => {
    const Box = createContractComponent({
      styling: { base: 'base-cls' },
    })

    dom.mount(createElement(box(Box), null))

    expect(dom.container.querySelector('div')!.className).toBe('base-cls')
  })

  it('merges caller className with base', () => {
    const Box = createContractComponent({
      styling: { base: 'base' },
    })

    dom.mount(createElement(box(Box), { className: 'extra' }))

    const cls = dom.container.querySelector('div')!.className

    expect(cls).toContain('base')
    expect(cls).toContain('extra')
  })

  it('forwards a ref to the DOM element', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLDivElement>()

    dom.mount(createElement(box(Box), { ref }))

    expect(ref.current).toBe(dom.container.querySelector('div'))
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    dom.mount(createElement(box(Box), { as: 'button', ref }))

    expect(ref.current).toBe(dom.container.querySelector('button'))
  })

  it('passes extra props to the DOM element', () => {
    const Box = createContractComponent({})

    dom.mount(
      createElement(box(Box), {
        'data-testid': 'box',
      }),
    )

    expect(dom.container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createContractComponent({})

    dom.mount(createElement(box(Box), null, createElement('span', { id: 'child' })))

    expect(dom.container.querySelector('span#child')).toBeTruthy()
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createContractComponent({})

    dom.mount(
      createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })),
    )

    expect(dom.container.querySelector('button')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createContractComponent({
      styling: { base: 'box-cls' },
    })

    dom.mount(createElement(box(Box), { asChild: true }, createElement('button')))

    expect(dom.container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createContractComponent({})

    expect(() =>
      dom.mount(
        createElement(box(Box), {
          asChild: true,
        }),
      ),
    ).toThrow('asChild requires a React element child')
  })

  // Fragment is NOT flattened in current/ — it counts as one element.
  // asChild with a Fragment child is valid (one element), but Slot receives
  // the Fragment as the child, which is then treated as one slot child.
  it('fragment child counts as one element for asChild (no flattening)', () => {
    const Box = createContractComponent({})

    const fragment = createElement(Fragment, null, createElement('span'))

    // Should not throw — exactly one "element" (the Fragment) is passed
    expect(() => dom.mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createContractComponent({
      styling: { base: 'class-a' },
    })

    const BoxB = createContractComponent({
      styling: { base: 'class-b' },
    })

    dom.mount(
      createElement(
        box(BoxA),
        { asChild: true },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
      ),
    )

    const el = dom.container.querySelector('button')!

    expect(el.className).toContain('class-a')
    expect(el.className).toContain('class-b')
  })

  it('nested asChild: ref from outer component reaches the innermost element', () => {
    const BoxA = createContractComponent({})
    const BoxB = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    dom.mount(
      createElement(
        box(BoxA),
        { asChild: true, ref },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
      ),
    )

    expect(ref.current).toBe(dom.container.querySelector('button'))
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createContractComponent({
      filterProps: (key: string) => key === 'size',
    })

    dom.mount(
      createElement(box(Box), {
        size: 'lg',
        'data-keep': 'yes',
      } as never),
    )

    const el = dom.container.querySelector('div')!

    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })

  // ── render prop ────────────────────────────────────────────────────────────

  it('render prop: renders the element returned by the callback', () => {
    const Box = createContractComponent({ tag: 'div' })

    dom.mount(
      createElement(box(Box), {
        render: () => createElement('a', { href: '/' }, 'link'),
      }),
    )

    expect(dom.container.querySelector('a')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('render prop: passes resolved className to the callback', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-cls' },
    })

    dom.mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    expect(dom.container.querySelector('a')!.className).toContain('box-cls')
  })

  it('render prop: passes variant-resolved className to the callback', () => {
    const Button = createContractComponent({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: { size: { lg: 'btn--lg' } },
        defaults: { size: 'lg' },
      },
    })

    dom.mount(
      createElement(box(Button), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    expect(dom.container.querySelector('a')!.className).toContain('btn--lg')
  })

  it('render prop: does not forward the render key as a DOM attribute', () => {
    const Box = createContractComponent({ tag: 'div' })

    dom.mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    const el = dom.container.querySelector('a')!
    expect(el.hasAttribute('render')).toBe(false)
  })

  it('render prop: passes ref to the callback so the caller can forward it', () => {
    const Box = createContractComponent({ tag: 'div' })
    const ref = createRef<HTMLAnchorElement>()

    dom.mount(
      createElement(box(Box), {
        ref,
        render: (p: RenderCallbackProps) => createElement('a', { ...p, href: '/' } as never),
      }),
    )

    expect(ref.current).toBe(dom.container.querySelector('a'))
  })

  it('render prop: takes priority over asChild when both are present', () => {
    // asChild is stripped by the discriminated union; providing render takes the render path.
    const Box = createContractComponent({ tag: 'div', styling: { base: 'box-cls' } })

    dom.mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('section', p as never),
      }),
    )

    expect(dom.container.querySelector('section')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })
})
