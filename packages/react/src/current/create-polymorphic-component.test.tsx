// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, Fragment, createRef, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type { PolymorphicComponent, RenderCallbackProps, UnknownProps } from '@/shared'
import { createPolymorphicComponent } from './create-polymorphic-component'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: PolymorphicComponent<any>) {
  return comp as ComponentType<UnknownProps>
}

let container: HTMLElement
let root: ReturnType<typeof createRoot>

function mount(element: ReturnType<typeof createElement>) {
  act(() => {
    root.render(element)
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  document.body.removeChild(container)
})

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
    mount(createElement(box(Box), null))
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a configured default tag', () => {
    const Box = createPolymorphicComponent({ tag: 'section' })
    mount(createElement(box(Box), null))
    expect(container.querySelector('section')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createPolymorphicComponent({})
    mount(createElement(box(Box), { as: 'article' }))
    expect(container.querySelector('article')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies caller className directly (no base class without styling)', () => {
    const Box = createPolymorphicComponent({})
    mount(createElement(box(Box), { className: 'my-class' }))
    expect(container.querySelector('div')!.className).toBe('my-class')
  })

  it('produces no className when none supplied (no styling runtime)', () => {
    const Box = createPolymorphicComponent({})
    mount(createElement(box(Box), null))
    expect(container.querySelector('div')!.className).toBe('')
  })

  it('forwards a ref to the DOM element', () => {
    const Box = createPolymorphicComponent({})
    const ref = createRef<HTMLDivElement>()
    mount(createElement(box(Box), { ref }))
    expect(ref.current).toBe(container.querySelector('div'))
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Box = createPolymorphicComponent({})
    const ref = createRef<HTMLButtonElement>()
    mount(createElement(box(Box), { as: 'button', ref }))
    expect(ref.current).toBe(container.querySelector('button'))
  })

  it('passes extra props to the DOM element', () => {
    const Box = createPolymorphicComponent({})
    mount(createElement(box(Box), { 'data-testid': 'box' }))
    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createPolymorphicComponent({})
    mount(createElement(box(Box), null, createElement('span', { id: 'child' })))
    expect(container.querySelector('span#child')).toBeTruthy()
  })

  it('merges default props with instance props', () => {
    const Box = createPolymorphicComponent({ defaults: { 'data-default': 'yes' } as never })
    mount(createElement(box(Box), { 'data-instance': 'also' } as never))
    const el = container.querySelector('div')!
    expect(el.getAttribute('data-default')).toBe('yes')
    expect(el.getAttribute('data-instance')).toBe('also')
  })

  it('instance props override defaults', () => {
    const Box = createPolymorphicComponent({ defaults: { 'data-x': 'default' } as never })
    mount(createElement(box(Box), { 'data-x': 'override' } as never))
    expect(container.querySelector('div')!.getAttribute('data-x')).toBe('override')
  })

  // No ARIA engine — invalid aria-* attributes pass through unstripped
  it('passes aria-* attributes through without stripping (no engine)', () => {
    const Box = createPolymorphicComponent({ tag: 'button' })
    mount(createElement(box(Box), { 'aria-checked': 'true' } as never))
    expect(container.querySelector('button')!.getAttribute('aria-checked')).toBe('true')
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createPolymorphicComponent({
      filterProps: (key: string) => key === 'size',
    })
    mount(createElement(box(Box), { size: 'lg', 'data-keep': 'yes' } as never))
    const el = container.querySelector('div')!
    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createPolymorphicComponent({})
    mount(createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })))
    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('asChild merges caller className onto the child element', () => {
    const Box = createPolymorphicComponent({})
    mount(createElement(box(Box), { asChild: true, className: 'box-cls' }, createElement('button')))
    expect(container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createPolymorphicComponent({})
    expect(() => mount(createElement(box(Box), { asChild: true }))).toThrow(
      'asChild requires exactly one React element child, got 0',
    )
  })

  it('fragment child counts as one element for asChild (no flattening)', () => {
    const Box = createPolymorphicComponent({})
    const fragment = createElement(Fragment, null, createElement('span'))
    expect(() => mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createPolymorphicComponent({})
    const BoxB = createPolymorphicComponent({})
    mount(
      createElement(
        box(BoxA),
        { asChild: true, className: 'class-a' },
        createElement(box(BoxB), { asChild: true, className: 'class-b' }, createElement('button')),
      ),
    )
    const el = container.querySelector('button')!
    expect(el.className).toContain('class-a')
    expect(el.className).toContain('class-b')
  })

  it('nested asChild: ref from outer component reaches the innermost element', () => {
    const BoxA = createPolymorphicComponent({})
    const BoxB = createPolymorphicComponent({})
    const ref = createRef<HTMLButtonElement>()
    mount(
      createElement(
        box(BoxA),
        { asChild: true, ref },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
      ),
    )
    expect(ref.current).toBe(container.querySelector('button'))
  })

  // ── render prop ────────────────────────────────────────────────────────────

  it('render prop: renders the element returned by the callback', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    mount(createElement(box(Box), { render: () => createElement('a', { href: '/' }, 'link') }))
    expect(container.querySelector('a')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('render prop: passes caller className to the callback', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    mount(
      createElement(box(Box), {
        className: 'my-cls',
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )
    expect(container.querySelector('a')!.className).toContain('my-cls')
  })

  it('render prop: does not forward the render key as a DOM attribute', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )
    expect(container.querySelector('a')!.hasAttribute('render')).toBe(false)
  })

  it('render prop: passes ref to the callback so the caller can forward it', () => {
    const Box = createPolymorphicComponent({ tag: 'div' })
    const ref = createRef<HTMLAnchorElement>()
    mount(
      createElement(box(Box), {
        ref,
        render: (p: RenderCallbackProps) => createElement('a', { ...p, href: '/' } as never),
      }),
    )
    expect(ref.current).toBe(container.querySelector('a'))
  })
})
