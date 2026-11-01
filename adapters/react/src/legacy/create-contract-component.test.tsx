// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createElement, Fragment, createRef } from 'react'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import type { RenderCallbackProps } from '../shared'
import { box, useReactDom } from '../shared/test-utils'
import { COMPOSITION_STYLE_REQUEST_PROP } from '@praxis-kit/adapter-utils'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

describe('createContractComponent (legacy / React 18)', () => {
  it('sets displayName', () => {
    const Comp = createContractComponent({ name: 'MyBox' })
    expect(Comp.displayName).toBe('MyBox')
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
  })

  it('resolves composed Praxis styling once with primary defaults taking precedence', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        base: 'partner-base',
        variants: {
          tone: { quiet: 'partner-quiet', loud: 'partner-loud' },
          size: { sm: 'partner-sm' },
        },
        defaults: { tone: 'quiet', size: 'sm' },
      },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface, defaults: { tone: 'quiet', size: 'sm' } },
      styling: {
        base: 'primary-base',
        variants: {
          tone: { quiet: 'primary-quiet', loud: 'primary-loud' },
          density: { compact: 'primary-compact' },
        },
        defaults: { tone: 'loud' },
      },
    })

    dom.mount(createElement(box(Card), { density: 'compact', className: 'caller-class' }))

    const classes = dom.container.querySelector('div')!.className.split(' ')
    expect(classes).toContain('partner-base')
    expect(classes).toContain('primary-base')
    expect(classes).toContain('partner-loud')
    expect(classes).toContain('primary-loud')
    expect(classes).toContain('partner-sm')
    expect(classes).toContain('primary-compact')
    expect(classes).toContain('caller-class')
    expect(classes.filter((value) => value === 'partner-base')).toHaveLength(1)
    expect(classes.filter((value) => value === 'primary-base')).toHaveLength(1)
    expect(classes).not.toContain('partner-quiet')
    expect(classes).not.toContain('primary-quiet')
  })

  it('resolves partner-only variants and compounds when allProps is disabled', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        variants: {
          intent: { ghost: 'partner-intent-ghost' },
          size: { lg: 'partner-size-lg' },
        },
        compounds: [{ intent: 'ghost', size: 'lg', class: 'partner-compound-ghost-lg' }],
      },
    })
    const Card = createContractComponent({ compose: { with: Surface } })

    dom.mount(createElement(box(Card), { intent: 'ghost', size: 'lg' }))

    const classes = dom.container.querySelector('div')!.className.split(' ')
    expect(classes).toContain('partner-intent-ghost')
    expect(classes).toContain('partner-size-lg')
    expect(classes).toContain('partner-compound-ghost-lg')
  })

  it('resolves partner variants and compounds from allProps forwarded props', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        variants: {
          intent: { ghost: 'partner-intent-ghost' },
          size: { lg: 'partner-size-lg' },
        },
        compounds: [{ intent: 'ghost', size: 'lg', class: 'partner-compound-ghost-lg' }],
      },
    })
    const Card = createContractComponent({ compose: { with: Surface, allProps: true } })

    dom.mount(createElement(box(Card), { intent: 'ghost', size: 'lg' }))

    const classes = dom.container.querySelector('div')!.className.split(' ')
    expect(classes).toContain('partner-intent-ghost')
    expect(classes).toContain('partner-size-lg')
    expect(classes).toContain('partner-compound-ghost-lg')
  })

  it('matches partner compounds using compose.defaults and allProps-forwarded props', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        variants: {
          intent: { ghost: 'partner-intent-ghost' },
          size: { lg: 'partner-size-lg' },
        },
        compounds: [{ intent: 'ghost', size: 'lg', class: 'partner-compound-ghost-lg' }],
      },
    })
    const Card = createContractComponent({
      compose: { with: Surface, allProps: true, defaults: { intent: 'ghost' } },
    })

    dom.mount(createElement(box(Card), { size: 'lg' }))

    const classes = dom.container.querySelector('div')!.className.split(' ')
    expect(classes).toContain('partner-intent-ghost')
    expect(classes).toContain('partner-size-lg')
    expect(classes).toContain('partner-compound-ghost-lg')
  })

  it('forwards a ref to the DOM element via forwardRef', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLDivElement>()
    dom.mount(createElement(box(Box), { ref }))
    expect(ref.current).toBe(dom.container.querySelector('div'))
  })

  it('renders children', () => {
    const Box = createContractComponent({})
    dom.mount(createElement(box(Box), null, createElement('span', { id: 'child' })))
    expect(dom.container.querySelector('span#child')).toBeTruthy()
  })

  it('uses the Tailwind plugin for combined classes and filters plugin-owned props from the host', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: { base: 'grid-cols-3 gap-4 rounded' },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface },
      styling: { base: 'border', plugin: createTailwindPipeline },
    })

    dom.mount(createElement(box(Card), { flex: true }))

    const element = dom.container.querySelector('div')!
    expect(element.className).toContain('flex')
    expect(element.className).toContain('gap-4')
    expect(element.className).toContain('rounded')
    expect(element.className).toContain('border')
    expect(element.className).not.toContain('grid-cols-3')
    expect(element.getAttribute('flex')).toBeNull()
  })

  it('ignores a malformed internal composition style request', () => {
    const Box = createContractComponent({ styling: { base: 'legacy-base' } })

    expect(() =>
      dom.mount(
        createElement(
          box(Box),
          { asChild: true, [COMPOSITION_STYLE_REQUEST_PROP]: { resolveClasses: 'not-a-function' } },
          createElement('button'),
        ),
      ),
    ).not.toThrow()

    expect(dom.container.querySelector('button')!.className).toContain('legacy-base')
  })

  it('asChild renders the child element type', () => {
    const Box = createContractComponent({})
    dom.mount(
      createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })),
    )
    expect(dom.container.querySelector('button')).toBeTruthy()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createContractComponent({ styling: { base: 'legacy-cls' } })
    dom.mount(createElement(box(Box), { asChild: true }, createElement('button')))
    expect(dom.container.querySelector('button')!.className).toContain('legacy-cls')
  })

  // In React 19, Children.toArray no longer flattens Fragments — both legacy and
  // current adapters treat a Fragment as a single opaque element. The flattening
  // behavior that distinguished legacy only existed in React 18.
  it('fragment with multiple children does not throw in React 19 (no flattening)', () => {
    const Box = createContractComponent({})
    const fragment = createElement(Fragment, null, createElement('span'), createElement('div'))
    expect(() => dom.mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('keeps explicit asChild rendering on the primary contract styling path', () => {
    const Surface = createContractComponent({ tag: 'div', styling: { base: 'partner-base' } })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface },
      styling: { base: 'primary-base' },
    })

    dom.mount(createElement(box(Card), { asChild: true }, createElement('button')))

    const element = dom.container.querySelector('button')!
    expect(element.className).toContain('primary-base')
    expect(element.className).not.toContain('partner-base')
  })

  it('keeps custom render on the primary contract styling path when composed', () => {
    const Surface = createContractComponent({
      tag: 'div',
      styling: {
        base: 'partner-base',
        variants: { intent: { loud: 'partner-loud' } },
        presets: { emphasis: { intent: 'loud' } },
      },
    })
    const Card = createContractComponent({
      tag: 'div',
      compose: { with: Surface, defaults: { intent: 'loud' } },
      styling: {
        base: 'primary-base',
        variants: { size: { lg: 'primary-lg' } },
        presets: { emphasis: { size: 'lg' } },
      },
    })

    dom.mount(
      createElement(box(Card), {
        recipe: 'emphasis',
        render: (props: RenderCallbackProps) => createElement('button', props as never),
      }),
    )

    const element = dom.container.querySelector('button')!
    expect(element.className).toContain('primary-base')
    expect(element.className).toContain('primary-lg')
    expect(element.className).not.toContain('partner-base')
    expect(element.className).not.toContain('partner-loud')
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createContractComponent({ styling: { base: 'class-a' } })
    const BoxB = createContractComponent({ styling: { base: 'class-b' } })
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

  // `compose` (declarative asChild composition) is covered by the shared conformance suite
  // (`conformance.test.tsx` → `testing/packages/adapter-testing/src/conformance.ts`, "conformance —
  // compose") rather than duplicated here — same convention as `asChild` itself.

  it('applies filterProps', () => {
    const Box = createContractComponent({
      filterProps: (key: string) => key === 'size',
    })
    dom.mount(createElement(box(Box), { size: 'lg', 'data-keep': 'yes' } as never))
    const el = dom.container.querySelector('div')!
    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })
})

// Public factory validation runs after options inference: partner variants are accepted, while
// variants owned only by the primary component are rejected in compose.defaults.
const ComposeDefaultsSurface = createContractComponent({
  tag: 'div',
  name: 'ComposeDefaultsSurface',
  props: undefined as unknown as { radius?: 'sm' | 'lg' },
  styling: { variants: { tone: { quiet: 'tone-quiet', loud: 'tone-loud' } } },
})
const ComposeDefaultsValid = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsValid',
  styling: { variants: { size: { small: 'size-small', large: 'size-large' } } },
  compose: { with: ComposeDefaultsSurface, defaults: { tone: 'quiet' } as const },
})
void ComposeDefaultsValid

const ComposeDefaultsInvalid = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalid',
  styling: { variants: { size: { small: 'size-small', large: 'size-large' } } },
  // @ts-expect-error — `size` belongs to the primary component, not ComposeDefaultsSurface.
  compose: { with: ComposeDefaultsSurface, defaults: { size: 'small' } as const },
})
void ComposeDefaultsInvalid

const ComposeDefaultsInvalidOrdinary = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalidOrdinary',
  // @ts-expect-error — ordinary partner props are not declared variants and cannot be defaulted.
  compose: { with: ComposeDefaultsSurface, defaults: { radius: 'sm' } as const },
})
void ComposeDefaultsInvalidOrdinary

const ComposeDefaultsInvalidValue = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalidValue',
  // @ts-expect-error — a declared partner variant still rejects values outside its declared set.
  compose: { with: ComposeDefaultsSurface, defaults: { tone: 'bright' } as const },
})
void ComposeDefaultsInvalidValue
