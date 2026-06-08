// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, Fragment, createRef, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type {
  PolymorphicComponent,
  RenderCallbackProps,
  UnknownProps,
} from '@praxis-kit/react/shared'
import { createContractComponent } from './create-contract-component'

// Cast to bypass the PolymorphicComponent union in createElement overloads.
// Accepts PolymorphicComponent<any> so concrete generic instantiations (e.g. EmptyRecord
// variants) are assignable regardless of the three-overload variance check.
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

    mount(createElement(box(Box), null))

    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createContractComponent({})

    mount(createElement(box(Box), { as: 'section' }))

    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies baseClassName', () => {
    const Box = createContractComponent({
      styling: { base: 'base-cls' },
    })

    mount(createElement(box(Box), null))

    expect(container.querySelector('div')!.className).toBe('base-cls')
  })

  it('merges caller className with base', () => {
    const Box = createContractComponent({
      styling: { base: 'base' },
    })

    mount(createElement(box(Box), { className: 'extra' }))

    const cls = container.querySelector('div')!.className

    expect(cls).toContain('base')
    expect(cls).toContain('extra')
  })

  it('forwards a ref to the DOM element', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLDivElement>()

    mount(createElement(box(Box), { ref }))

    expect(ref.current).toBe(container.querySelector('div'))
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    mount(createElement(box(Box), { as: 'button', ref }))

    expect(ref.current).toBe(container.querySelector('button'))
  })

  it('passes extra props to the DOM element', () => {
    const Box = createContractComponent({})

    mount(
      createElement(box(Box), {
        'data-testid': 'box',
      }),
    )

    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createContractComponent({})

    mount(createElement(box(Box), null, createElement('span', { id: 'child' })))

    expect(container.querySelector('span#child')).toBeTruthy()
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createContractComponent({})

    mount(createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })))

    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createContractComponent({
      styling: { base: 'box-cls' },
    })

    mount(createElement(box(Box), { asChild: true }, createElement('button')))

    expect(container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createContractComponent({})

    expect(() =>
      mount(
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
    expect(() => mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createContractComponent({
      styling: { base: 'class-a' },
    })

    const BoxB = createContractComponent({
      styling: { base: 'class-b' },
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
    const BoxA = createContractComponent({})
    const BoxB = createContractComponent({})
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
    const Box = createContractComponent({
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

  // ── render prop ────────────────────────────────────────────────────────────

  it('render prop: renders the element returned by the callback', () => {
    const Box = createContractComponent({ tag: 'div' })

    mount(
      createElement(box(Box), {
        render: () => createElement('a', { href: '/' }, 'link'),
      }),
    )

    expect(container.querySelector('a')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('render prop: passes resolved className to the callback', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-cls' },
    })

    mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    expect(container.querySelector('a')!.className).toContain('box-cls')
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

    mount(
      createElement(box(Button), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    expect(container.querySelector('a')!.className).toContain('btn--lg')
  })

  it('render prop: does not forward the render key as a DOM attribute', () => {
    const Box = createContractComponent({ tag: 'div' })

    mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    const el = container.querySelector('a')!
    expect(el.hasAttribute('render')).toBe(false)
  })

  it('render prop: passes ref to the callback so the caller can forward it', () => {
    const Box = createContractComponent({ tag: 'div' })
    const ref = createRef<HTMLAnchorElement>()

    mount(
      createElement(box(Box), {
        ref,
        render: (p: RenderCallbackProps) => createElement('a', { ...p, href: '/' } as never),
      }),
    )

    expect(ref.current).toBe(container.querySelector('a'))
  })

  it('render prop: takes priority over asChild when both are present', () => {
    // asChild is stripped by the discriminated union; providing render takes the render path.
    const Box = createContractComponent({ tag: 'div', styling: { base: 'box-cls' } })

    mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('section', p as never),
      }),
    )

    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })
})
