import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, Fragment, createRef, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { createPolymorphicComponent } from './create-polymorphic-component'

type AnyProps = Record<string, unknown>

// Cast to bypass the PolymorphicComponent union in createElement overloads.
function box(comp: ReturnType<typeof createPolymorphicComponent>) {
  return comp as ComponentType<AnyProps>
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
    const Comp = createPolymorphicComponent({ displayName: 'MyBox' })

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

  it('renders a different tag via the as prop', () => {
    const Box = createPolymorphicComponent({})

    mount(createElement(box(Box), { as: 'section' }))

    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies baseClassName', () => {
    const Box = createPolymorphicComponent({
      baseClassName: 'base-cls',
    })

    mount(createElement(box(Box), null))

    expect(container.querySelector('div')!.className).toBe('base-cls')
  })

  it('merges caller className with base', () => {
    const Box = createPolymorphicComponent({
      baseClassName: 'base',
    })

    mount(createElement(box(Box), { className: 'extra' }))

    const cls = container.querySelector('div')!.className

    expect(cls).toContain('base')
    expect(cls).toContain('extra')
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

    mount(
      createElement(box(Box), {
        'data-testid': 'box',
      }),
    )

    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createPolymorphicComponent({})

    mount(createElement(box(Box), null, createElement('span', { id: 'child' })))

    expect(container.querySelector('span#child')).toBeTruthy()
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createPolymorphicComponent({})

    mount(createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })))

    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createPolymorphicComponent({
      baseClassName: 'box-cls',
    })

    mount(createElement(box(Box), { asChild: true }, createElement('button')))

    expect(container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createPolymorphicComponent({})

    expect(() =>
      mount(
        createElement(box(Box), {
          asChild: true,
        }),
      ),
    ).toThrow('asChild requires exactly one React element child, got 0')
  })

  // Fragment is NOT flattened in current/ — it counts as one element.
  // asChild with a Fragment child is valid (one element), but Slot receives
  // the Fragment as the child, which is then treated as one slot child.
  it('fragment child counts as one element for asChild (no flattening)', () => {
    const Box = createPolymorphicComponent({})

    const fragment = createElement(Fragment, null, createElement('span'))

    // Should not throw — exactly one "element" (the Fragment) is passed
    expect(() => mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createPolymorphicComponent({
      baseClassName: 'class-a',
    })

    const BoxB = createPolymorphicComponent({
      baseClassName: 'class-b',
    })

    mount(
      createElement(
        box(BoxA),
        { asChild: true },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
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

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createPolymorphicComponent({
      filterProps: (key: string) => key === 'size',
    })

    mount(
      createElement(box(Box), {
        size: 'lg',
        'data-keep': 'yes',
      } as never),
    )

    const el = container.querySelector('div')!

    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })
})
