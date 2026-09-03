// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { h, Fragment, createRef, render } from 'preact'
import { forwardRef } from 'preact/compat'
import type { ComponentType, ComponentProps } from 'preact'
import { silentDiagnostics, throwDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'
import type { AnyVNode, UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

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

describe('createContractComponent (Preact adapter)', () => {
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

    mount(h(box(Box), null))

    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createContractComponent({})

    mount(h(box(Box), { as: 'section' }))

    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies base class', () => {
    const Box = createContractComponent({
      styling: { base: 'base-cls' },
    })

    mount(h(box(Box), null))

    expect(container.querySelector('div')!.className).toBe('base-cls')
  })

  it('merges caller className with base', () => {
    const Box = createContractComponent({
      styling: { base: 'base' },
    })

    mount(h(box(Box), { className: 'extra' }))

    const cls = container.querySelector('div')!.className

    expect(cls).toContain('base')
    expect(cls).toContain('extra')
  })

  it('forwards a ref to the DOM element', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLDivElement>()

    mount(h(box(Box), { ref }))

    expect(ref.current).toBe(container.querySelector('div'))
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    mount(h(box(Box), { as: 'button', ref }))

    expect(ref.current).toBe(container.querySelector('button'))
  })

  it('passes extra props to the DOM element', () => {
    const Box = createContractComponent({})

    mount(h(box(Box), { 'data-testid': 'box' }))

    expect(container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createContractComponent({})

    mount(h(box(Box), null, h('span', { id: 'child' })))

    expect(container.querySelector('span#child')).toBeTruthy()
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createContractComponent({})

    mount(h(box(Box), { asChild: true }, h('button', { type: 'button' })))

    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createContractComponent({
      styling: { base: 'box-cls' },
    })

    mount(h(box(Box), { asChild: true }, h('button', null)))

    expect(container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createContractComponent({})

    expect(() =>
      mount(
        h(box(Box), {
          asChild: true,
        }),
      ),
    ).toThrow('asChild requires a Preact element child')
  })

  it('fragment child counts as one element for asChild (no flattening)', () => {
    const Box = createContractComponent({})

    const fragment = h(Fragment, null, h('span', null))

    expect(() => mount(h(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createContractComponent({
      styling: { base: 'class-a' },
    })

    const BoxB = createContractComponent({
      styling: { base: 'class-b' },
    })

    mount(h(box(BoxA), { asChild: true }, h(box(BoxB), { asChild: true }, h('button', null))))

    const el = container.querySelector('button')!

    expect(el.className).toContain('class-a')
    expect(el.className).toContain('class-b')
  })

  it('nested asChild: ref from outer component reaches the innermost element', () => {
    const BoxA = createContractComponent({})
    const BoxB = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    mount(h(box(BoxA), { asChild: true, ref }, h(box(BoxB), { asChild: true }, h('button', null))))

    expect(ref.current).toBe(container.querySelector('button'))
  })

  it('asChild warns when it drops a text sibling it cannot compose onto the slotted element', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({ diagnostics: warnDiagnostics })

    mount(h(box(Box), { asChild: true }, h('a', null), 'trailing text'))

    expect(container.querySelector('a')).toBeTruthy()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-element child'))
    warnSpy.mockRestore()
  })

  it('asChild does not warn for a falsy conditional sibling (`{cond && <X/>}`)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({ diagnostics: warnDiagnostics })

    // Preact arrays the `false` / `null` / whitespace; none of them render, so none are discarded.
    mount(h(box(Box), { asChild: true }, false, h('a', null), '  ', null))

    expect(container.querySelector('a')).toBeTruthy()
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createContractComponent({
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
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })

    mount(h(box(Nav), { role: 'navigation' } as never))

    expect(container.querySelector('nav')!.getAttribute('role')).toBeNull()
  })

  it('applies variant classes', () => {
    const Box = createContractComponent({
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
    const Group = createContractComponent({
      tag: 'div',
      enforcement: {
        diagnostics: throwDiagnostics,
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

// The full ref chain: forwardRef(Component) → render() → renderIntrinsic / Slot → DOM. `../pk`
// only covered the default tag, an `as` override, and nested asChild. Preact treats a DOM
// target, a component target, and a Slot target differently, so each is pinned here.
describe('ref forwarding — DOM, as, component-as, asChild, replacement, unmount', () => {
  it('as={forwardRef component}: ref reaches the component-forwarded element', () => {
    const Inner = forwardRef<HTMLButtonElement, UnknownProps>((props, ref) =>
      h('button', { ...props, ref }),
    )
    const Box = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    mount(h(box(Box), { as: Inner, ref } as never))

    expect(ref.current).toBe(container.querySelector('button'))
  })

  it('asChild: ref reaches the slotted child element (single level)', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLAnchorElement>()

    mount(h(box(Box), { asChild: true, ref }, h('a', { href: '#x' })))

    expect(ref.current).toBe(container.querySelector('a'))
  })

  it('element replacement (as change): the ref moves to the new host element', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLElement>()

    mount(h(box(Box), { as: 'section', ref }))
    expect(ref.current).toBe(container.querySelector('section'))

    mount(h(box(Box), { as: 'article', ref }))
    expect(ref.current).toBe(container.querySelector('article'))
    expect(container.querySelector('section')).toBeNull()
  })

  it('unmount: the ref is cleared to null', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLDivElement>()

    mount(h(box(Box), { ref }))
    expect(ref.current).not.toBeNull()

    render(null, container)
    expect(ref.current).toBeNull()
  })
})

// Regression coverage for a divergence between JSX's own attribute checking and a direct
// `ComponentProps<typeof Component>` extraction (the mechanism Storybook's `Meta`/`StoryObj`
// helpers use internally to type `args`/`argTypes`). TypeScript resolves a conditional type
// against an overloaded call signature using only its last member, and every prior overload was
// generic with no call site to infer `TAs` from — so a native attribute like `disabled` used to
// vanish from the extracted type even though it worked fine directly in JSX.
describe('ComponentProps<typeof Component> — extraction outside JSX', () => {
  const Button = createContractComponent({ tag: 'button', name: 'Button' })
  void Button
  type ButtonProps = ComponentProps<typeof Button>

  it('includes a native attribute of the default element (disabled)', () => {
    const props: ButtonProps = { disabled: true }
    void props
  })

  it('includes an intrinsic attribute alongside disabled (type)', () => {
    const props: ButtonProps = { disabled: true, type: 'submit' }
    void props
  })
})
