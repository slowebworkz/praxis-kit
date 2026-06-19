// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createElement, Fragment, createRef } from 'react'
import type { RenderCallbackProps } from '../shared'
import { box, useReactDom } from '../shared/test-utils'
import { createPolymorphicComponent } from './create-polymorphic-component'

const dom = useReactDom()

describe('createPolymorphicComponent (current / React 19)', () => {
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
    dom.mount(createElement(box(Box), null))
    expect(dom.container.querySelector('div')).toBeTruthy()
  })

  it('renders a configured default tag', () => {
    const Box = createPolymorphicComponent({ tag: 'section' })
    dom.mount(createElement(box(Box), null))
    expect(dom.container.querySelector('section')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createPolymorphicComponent({})
    dom.mount(createElement(box(Box), { as: 'article' }))
    expect(dom.container.querySelector('article')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('applies caller className directly (no base class without styling)', () => {
    const Box = createPolymorphicComponent({})
    dom.mount(createElement(box(Box), { className: 'my-class' }))
    expect(dom.container.querySelector('div')!.className).toBe('my-class')
  })

  it('produces no className when none supplied (no styling runtime)', () => {
    const Box = createPolymorphicComponent({})
    dom.mount(createElement(box(Box), null))
    expect(dom.container.querySelector('div')!.className).toBe('')
  })

  it('forwards a ref to the DOM element', () => {
    const Box = createPolymorphicComponent({})
    const ref = createRef<HTMLDivElement>()
    dom.mount(createElement(box(Box), { ref }))
    expect(ref.current).toBe(dom.container.querySelector('div'))
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Box = createPolymorphicComponent({})
    const ref = createRef<HTMLButtonElement>()
    dom.mount(createElement(box(Box), { as: 'button', ref }))
    expect(ref.current).toBe(dom.container.querySelector('button'))
  })

  it('passes extra props to the DOM element', () => {
    const Box = createPolymorphicComponent({})
    dom.mount(createElement(box(Box), { 'data-testid': 'box' }))
    expect(dom.container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createPolymorphicComponent({})
    dom.mount(createElement(box(Box), null, createElement('span', { id: 'child' })))
    expect(dom.container.querySelector('span#child')).toBeTruthy()
  })

  it('merges default props with instance props', () => {
    const Box = createPolymorphicComponent({ defaults: { 'data-default': 'yes' } as never })
    dom.mount(createElement(box(Box), { 'data-instance': 'also' } as never))
    const el = dom.container.querySelector('div')!
    expect(el.getAttribute('data-default')).toBe('yes')
    expect(el.getAttribute('data-instance')).toBe('also')
  })

  it('instance props override defaults', () => {
    const Box = createPolymorphicComponent({ defaults: { 'data-x': 'default' } as never })
    dom.mount(createElement(box(Box), { 'data-x': 'override' } as never))
    expect(dom.container.querySelector('div')!.getAttribute('data-x')).toBe('override')
  })

  // No ARIA engine — invalid aria-* attributes pass through unstripped
  it('passes aria-* attributes through without stripping (no engine)', () => {
    const Box = createPolymorphicComponent({ tag: 'button' })
    dom.mount(createElement(box(Box), { 'aria-checked': 'true' } as never))
    expect(dom.container.querySelector('button')!.getAttribute('aria-checked')).toBe('true')
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createPolymorphicComponent({
      filterProps: (key: string) => key === 'size',
    })
    dom.mount(createElement(box(Box), { size: 'lg', 'data-keep': 'yes' } as never))
    const el = dom.container.querySelector('div')!
    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createPolymorphicComponent({})
    dom.mount(
      createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })),
    )
    expect(dom.container.querySelector('button')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('asChild merges caller className onto the child element', () => {
    const Box = createPolymorphicComponent({})
    dom.mount(
      createElement(box(Box), { asChild: true, className: 'box-cls' }, createElement('button')),
    )
    expect(dom.container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createPolymorphicComponent({})
    expect(() => dom.mount(createElement(box(Box), { asChild: true }))).toThrow(
      'asChild requires a React element child',
    )
  })

  it('fragment child counts as one element for asChild (no flattening)', () => {
    const Box = createPolymorphicComponent({})
    const fragment = createElement(Fragment, null, createElement('span'))
    expect(() => dom.mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createPolymorphicComponent({})
    const BoxB = createPolymorphicComponent({})
    dom.mount(
      createElement(
        box(BoxA),
        { asChild: true, className: 'class-a' },
        createElement(box(BoxB), { asChild: true, className: 'class-b' }, createElement('button')),
      ),
    )
    const el = dom.container.querySelector('button')!
    expect(el.className).toContain('class-a')
    expect(el.className).toContain('class-b')
  })

  it('nested asChild: ref from outer component reaches the innermost element', () => {
    const BoxA = createPolymorphicComponent({})
    const BoxB = createPolymorphicComponent({})
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

  // ── render prop ────────────────────────────────────────────────────────────

  it('render prop: renders the element returned by the callback', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    dom.mount(createElement(box(Box), { render: () => createElement('a', { href: '/' }, 'link') }))
    expect(dom.container.querySelector('a')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('render prop: passes caller className to the callback', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    dom.mount(
      createElement(box(Box), {
        className: 'my-cls',
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )
    expect(dom.container.querySelector('a')!.className).toContain('my-cls')
  })

  it('render prop: does not forward the render key as a DOM attribute', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    dom.mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )
    expect(dom.container.querySelector('a')!.hasAttribute('render')).toBe(false)
  })

  it('render prop: passes ref to the callback so the caller can forward it', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    const ref = createRef<HTMLAnchorElement>()
    dom.mount(
      createElement(box(Box), {
        ref,
        render: (p: RenderCallbackProps) => createElement('a', { ...p, href: '/' } as never),
      }),
    )
    expect(ref.current).toBe(dom.container.querySelector('a'))
  })
})
