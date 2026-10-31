// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { h, Fragment, createRef, render } from 'preact'
import { forwardRef } from 'preact/compat'
import type { ComponentType, ComponentProps } from 'preact'
import { silentDiagnostics, throwDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import {
  TAILWIND_DISPLAY_PARITY_COMPOUNDS,
  TAILWIND_DISPLAY_PARITY_VARIANTS,
  tailwindDisplayParitySuite,
  createComposeConflictFixture,
  TAILWIND_COMPOSE_CONFLICT_COMPONENT,
  tailwindComposePluginParitySuite,
} from '@praxis-kit/adapter-utils/testing'
import type { AnyVNode, UnknownProps } from './types'
import { Slottable } from './slot'
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

  it('keeps partner, primary, and caller classes when composing', () => {
    const Surface = createContractComponent({
      styling: {
        base: 'partner-base',
        variants: { intent: { ghost: 'partner-intent-ghost' } },
      },
    })
    const Card = createContractComponent({
      compose: { with: Surface, defaults: { intent: 'ghost' } },
      styling: {
        base: 'primary-base',
        variants: { size: { lg: 'primary-size-lg' } },
      },
    })

    mount(h(box(Card), { size: 'lg', className: 'caller-class' }))

    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('partner-base')
    expect(el.className).toContain('partner-intent-ghost')
    expect(el.className).toContain('primary-base')
    expect(el.className).toContain('primary-size-lg')
    expect(el.className).toContain('caller-class')
  })

  it('ignores a malformed internal composition style request without leaking it to the DOM', () => {
    const Box = createContractComponent({ styling: { base: 'primary-base' } })

    expect(() =>
      mount(
        h(
          box(Box),
          { asChild: true, __praxisCompositionStyleRequest: { resolveClasses: 'not-a-function' } },
          h('button', null),
        ),
      ),
    ).not.toThrow()

    const el = container.querySelector('button')!
    expect(el.className).toContain('primary-base')
    expect(el.hasAttribute('__praxisCompositionStyleRequest')).toBe(false)
    expect(el.hasAttribute('__praxiscompositionstylerequest')).toBe(false)
  })

  it('keeps explicit asChild rendering on the primary contract styling path when composed', () => {
    const Surface = createContractComponent({ tag: 'div', styling: { base: 'partner-base' } })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface },
      styling: { base: 'primary-base' },
    })

    mount(h(box(Card), { asChild: true }, h('button', null)))

    const el = container.querySelector('button')!
    expect(el.className).toContain('primary-base')
    expect(el.className).not.toContain('partner-base')
  })

  it('falls back to primary styling when compose.with has no Praxis metadata', () => {
    const External = (props: UnknownProps) =>
      h('section', { className: 'external-base' }, props.children as never)
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: External as never },
      styling: {
        base: 'primary-base',
        variants: { tone: { quiet: 'primary-quiet' } },
      },
    })

    mount(h(box(Card), { tone: 'quiet' }))

    const external = container.querySelector('section')!
    const primary = container.querySelector('div')!
    expect(external.className).toContain('external-base')
    expect(primary.className).toContain('primary-base')
    expect(primary.className).toContain('primary-quiet')
    expect(primary.className).not.toContain('partner-')
  })

  it('forwards a ref to the rendered element through automatic composition', () => {
    const Surface = createContractComponent({ tag: 'div', styling: { base: 'partner-base' } })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface },
      styling: { base: 'primary-base' },
    })
    const ref = createRef<HTMLDivElement>()

    mount(h(box(Card), { ref }))

    const el = container.firstElementChild as HTMLElement
    expect(ref.current).toBe(el)
    expect(el.className).toContain('partner-base')
    expect(el.className).toContain('primary-base')
  })

  // `compose` (declarative asChild composition) is covered by the shared conformance suite
  // (`conformance.test.tsx` → `lib/adapter-utils/src/testing/conformance.ts`, "conformance —
  // compose") rather than duplicated here — same convention as `asChild` itself.

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

  it('asChild warns when nativeTagBehavior is set and the child tag is outside allowedAs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['button'], nativeTagBehavior: true },
    })

    mount(h(box(Trigger), { asChild: true }, h('a', null)))

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"a"'))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"button"'))
    warnSpy.mockRestore()
  })

  it('asChild does not warn when the child tag is within allowedAs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['button'], nativeTagBehavior: true },
    })

    mount(h(box(Trigger), { asChild: true }, h('button', null)))

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('asChild never warns when nativeTagBehavior is unset, regardless of the child tag', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['button'] },
    })

    mount(h(box(Box), { asChild: true }, h('a', null)))

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('asChild checks the real Slottable merge target, not the pass-through siblings around it', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['button'], nativeTagBehavior: true },
    })

    mount(
      h(box(Trigger), { asChild: true }, h(Slottable, null, h('a', null)), h('span', null, 'icon')),
    )

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"a"'))
    warnSpy.mockRestore()
  })

  it('asChild does not warn when the Slottable merge target is within allowedAs, pass-through siblings notwithstanding', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['button'], nativeTagBehavior: true },
    })

    mount(
      h(
        box(Trigger),
        { asChild: true },
        h(Slottable, null, h('button', null)),
        h('span', null, 'icon'),
      ),
    )

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

    mount(h(box(Box), { as: Inner, ref }))

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

tailwindDisplayParitySuite({
  renderers: {
    props: ({ tag = 'div', displayProps, layout, baseClassName, variantProps, className }) => {
      const Box = createContractComponent({
        tag,
        styling: {
          base: baseClassName ?? 'base',
          plugin: createTailwindPipeline,
          variants: TAILWIND_DISPLAY_PARITY_VARIANTS,
          compounds: TAILWIND_DISPLAY_PARITY_COMPOUNDS,
        },
      })
      mount(h(box(Box), { ...displayProps, ...variantProps, layout, className } as UnknownProps))
      return container.querySelector(tag)!.className
    },
  },
  reactivity: async (steps) => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'base', plugin: createTailwindPipeline },
    })
    return steps.map((step) => {
      mount(
        h(box(Box), {
          ...(step.displayProps ?? {}),
          layout: step.layout,
          className: step.className,
        } as UnknownProps),
      )
      return container.querySelector('div')!.className
    })
  },
})

tailwindComposePluginParitySuite({
  renderPartnerPlugin: () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: { base: 'grid-cols-3 gap-4 rounded', plugin: createTailwindPipeline },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { allProps: true, with: Surface },
      styling: { base: 'border' },
    })
    mount(h(box(Card), { flex: true }))
    const element = container.querySelector('div')!
    return { className: element.className, flexAttribute: element.getAttribute('flex') }
  },
  renderPrimaryWins: () => {
    const fixture = createComposeConflictFixture()
    const Surface = createContractComponent({
      tag: 'div',
      styling: { base: 'partner-base', plugin: fixture.partnerPlugin },
    })
    fixture.afterPartner()
    const Card = createContractComponent({
      tag: 'div',
      name: TAILWIND_COMPOSE_CONFLICT_COMPONENT,
      enforcement: { diagnostics: fixture.diagnostics },
      compose: { allProps: true, with: Surface },
      styling: { base: 'primary-base', plugin: fixture.primaryPlugin },
    })
    fixture.afterComposition()
    mount(h(box(Card), null))
    const element = container.querySelector('div')!
    return fixture.result({
      className: element.className,
      flexAttribute: element.getAttribute('flex'),
    })
  },
  renderOwnedDefault: () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: { base: 'partner-base', plugin: createTailwindPipeline },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { allProps: true, with: Surface, defaults: { flex: true } as never },
      styling: { base: 'primary-base' },
    })
    mount(h(box(Card), null))
    const element = container.querySelector('div')!
    return { className: element.className, flexAttribute: element.getAttribute('flex') }
  },
})
