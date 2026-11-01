import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Comment, createTextVNode, defineComponent, h, ref } from 'vue'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import {
  TAILWIND_DISPLAY_PARITY_COMPOUNDS,
  TAILWIND_DISPLAY_PARITY_VARIANTS,
  tailwindDisplayParitySuite,
  createComposeConflictFixture,
  TAILWIND_COMPOSE_CONFLICT_COMPONENT,
  tailwindComposePluginParitySuite,
  createCountedPlugin,
  tailwindAsChildPluginParitySuite,
  tailwindPolymorphicElementParitySuite,
} from '@praxis-kit/adapter-utils/testing'
import { Slottable } from './slot'
import { createContractComponent } from './create-contract-component'
import type { AnyRecord } from '@praxis-kit/primitive'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: unknown): any {
  return comp
}

describe('createContractComponent — displayName', () => {
  it('sets displayName on the component', () => {
    const Comp = createContractComponent({ name: 'MyBox' })
    expect((Comp as { displayName?: string }).displayName).toBe('MyBox')
  })

  it('falls back to PolymorphicComponent when displayName is omitted', () => {
    const Comp = createContractComponent({})
    expect((Comp as { displayName?: string }).displayName).toBe('PolymorphicComponent')
  })
})

describe('createContractComponent — tag rendering', () => {
  it('renders the default tag (div)', () => {
    const Box = createContractComponent({})
    const wrapper = mount(box(Box))
    expect(wrapper.element.tagName.toLowerCase()).toBe('div')
  })

  it('renders a different tag via the as prop', () => {
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), { props: { as: 'section' } })
    expect(wrapper.element.tagName.toLowerCase()).toBe('section')
  })

  it('respects a custom defaultTag', () => {
    const Box = createContractComponent({ tag: 'span' })
    const wrapper = mount(box(Box))
    expect(wrapper.element.tagName.toLowerCase()).toBe('span')
  })

  it('renders through a component reference passed as "as", not just a tag-name string', () => {
    // The `as never` cast mirrors the exact pattern an existing Preact test already uses
    // (`adapters/preact/src/create-contract-component.test.tsx`) to prove this already works
    // mechanically on React/Preact/Solid — only the type layer currently rejects it. This test
    // is the Vue-side proof; `prepareRenderState`'s own `typeof as === 'string'` guard
    // (render.ts) discards a non-string `as`, silently falling back to `defaultTag`, so without
    // the fix this renders a <div>, not a <button>.
    const Inner = defineComponent({
      name: 'Inner',
      setup(_, { attrs }) {
        return () => h('button', attrs)
      },
    })
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), { props: { as: Inner } as never })
    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
  })

  it('"as" + "asChild" together are still mutually exclusive when "as" is a component reference', () => {
    const Inner = defineComponent({
      name: 'Inner',
      setup(_, { attrs }) {
        return () => h('button', attrs)
      },
    })
    const Box = createContractComponent({})
    expect(() =>
      mount(box(Box), {
        props: { as: Inner, asChild: true } as never,
        slots: { default: () => [h('a', { href: '/' })] },
      }),
    ).toThrow('"as" and "asChild" are mutually exclusive')
  })
})

describe('createContractComponent — composition styling', () => {
  it('combines partner and primary base classes in contribution order', () => {
    const Surface = createContractComponent({ styling: { base: 'partner-base' } })
    const Card = createContractComponent({
      compose: { with: Surface },
      styling: { base: 'primary-base' },
    })
    const wrapper = mount(box(Card))

    expect(wrapper.element.className.indexOf('partner-base')).toBeGreaterThanOrEqual(0)
    expect(wrapper.element.className.indexOf('primary-base')).toBeGreaterThan(
      wrapper.element.className.indexOf('partner-base'),
    )
  })

  it('preserves explicit asChild styling instead of applying automatic composition', () => {
    const Surface = createContractComponent({ styling: { base: 'partner-base' } })
    const Card = createContractComponent({
      compose: { with: Surface },
      styling: { base: 'primary-base' },
    })
    const wrapper = mount(box(Card), {
      props: { asChild: true },
      slots: { default: () => h('button') },
    })

    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
    expect(wrapper.element.className).toContain('primary-base')
    expect(wrapper.element.className).not.toContain('partner-base')
  })

  it('ignores malformed internal resolver requests and does not forward them to the DOM', () => {
    const Surface = createContractComponent({ styling: { base: 'partner-base' } })
    const wrapper = mount(box(Surface), {
      props: {
        asChild: true,
        __praxisCompositionStyleRequest: { resolveClasses: 'not-a-function' },
      } as never,
      slots: { default: () => h('button') },
    })

    expect(wrapper.element.className).toContain('partner-base')
    expect(wrapper.element.hasAttribute('__praxisCompositionStyleRequest')).toBe(false)
    expect(wrapper.element.hasAttribute('__praxiscompositionstylerequest')).toBe(false)
  })
})

describe('createContractComponent — class merging', () => {
  it('applies baseClassName', () => {
    const Box = createContractComponent({ styling: { base: 'base-cls' } })
    const wrapper = mount(box(Box))
    expect(wrapper.element.className).toBe('base-cls')
  })

  it('merges caller class with baseClassName', () => {
    const Box = createContractComponent({ styling: { base: 'base' } })
    const wrapper = mount(box(Box), { props: { class: 'extra' } })
    expect(wrapper.element.className).toContain('base')
    expect(wrapper.element.className).toContain('extra')
  })
})

describe('createContractComponent — attrs', () => {
  it('forwards extra attrs to the DOM element', () => {
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), { attrs: { 'data-testid': 'box' } })
    expect(wrapper.element.getAttribute('data-testid')).toBe('box')
  })

  it('strips variant keys before DOM forwarding', () => {
    const Box = createContractComponent({
      styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
    })
    const wrapper = mount(box(Box), { props: { size: 'lg' } as never })
    expect(wrapper.element.getAttribute('size')).toBeNull()
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createContractComponent({
      filterProps: (key: string) => key === 'loading',
    })
    const wrapper = mount(box(Box), { attrs: { loading: 'true', 'data-keep': 'yes' } })
    expect(wrapper.element.getAttribute('loading')).toBeNull()
    expect(wrapper.element.getAttribute('data-keep')).toBe('yes')
  })
})

describe('createContractComponent — children', () => {
  it('renders slot children', () => {
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), {
      slots: { default: () => [h('span', { id: 'child' })] },
    })
    expect(wrapper.find('span#child').exists()).toBe(true)
  })
})

describe('createContractComponent — asChild', () => {
  it('renders the slot child element type instead of the default tag', () => {
    const Box = createContractComponent({})
    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h('button', { type: 'button' })] },
    })
    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('merges baseClassName onto the asChild element', () => {
    const Box = createContractComponent({ styling: { base: 'box-cls' } })
    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h('button')] },
    })
    expect(wrapper.element.className).toContain('box-cls')
  })

  it('throws when asChild has zero children', () => {
    const Box = createContractComponent({})
    expect(() =>
      mount(box(Box), {
        props: { asChild: true },
        slots: { default: () => [] },
      }),
    ).toThrow('asChild requires a VNode child')
  })

  it('throws when as and asChild are both provided', () => {
    const Box = createContractComponent({})
    expect(() =>
      mount(box(Box), {
        props: { as: 'button', asChild: true },
        slots: { default: () => [h('a', { href: '/' })] },
      }),
    ).toThrow('"as" and "asChild" are mutually exclusive')
  })

  // `allowedAs` includes the component's own default tag ('div') so Vue's separate,
  // pre-existing `enforceAllowedAs` call in `prepareRenderState` — which (unlike React/Preact)
  // checks the resolved tag against `allowedAs` unconditionally rather than only when a
  // caller-supplied `as` is present — doesn't also fire here and confound the assertion. 'div'
  // also carries no restrictive built-in HTML content-model evaluator, so an `<a>`/`<button>`
  // slot child doesn't separately trip `htmlChildrenEvaluatorFn`'s own check, which (also unlike
  // React) Vue evaluates against the resolved tag unconditionally, asChild notwithstanding.
  it('warns when nativeTagBehavior is set and the slot child tag is outside allowedAs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: {
        diagnostics: warnDiagnostics,
        allowedAs: ['div', 'button'],
        nativeTagBehavior: true,
      },
    })
    mount(box(Trigger), {
      props: { asChild: true },
      slots: { default: () => [h('a')] },
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"a"'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"button"'))
    warn.mockRestore()
  })

  it('does not warn when the slot child tag is within allowedAs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: {
        diagnostics: warnDiagnostics,
        allowedAs: ['div', 'button'],
        nativeTagBehavior: true,
      },
    })
    mount(box(Trigger), {
      props: { asChild: true },
      slots: { default: () => [h('button')] },
    })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('never warns when nativeTagBehavior is unset, regardless of the slot child tag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['div', 'button'] },
    })
    mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h('a')] },
    })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('checks the real Slottable merge target, not the pass-through siblings around it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: {
        diagnostics: warnDiagnostics,
        allowedAs: ['div', 'button'],
        nativeTagBehavior: true,
      },
    })
    mount(box(Trigger), {
      props: { asChild: true },
      slots: {
        default: () => [h(Slottable, null, { default: () => [h('a')] }), h('span', null, 'icon')],
      },
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"a"'))
    warn.mockRestore()
  })

  it('does not warn when the Slottable merge target is within allowedAs, pass-through siblings notwithstanding', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Trigger = createContractComponent({
      enforcement: {
        diagnostics: warnDiagnostics,
        allowedAs: ['div', 'button'],
        nativeTagBehavior: true,
      },
    })
    mount(box(Trigger), {
      props: { asChild: true },
      slots: {
        default: () => [
          h(Slottable, null, { default: () => [h('button')] }),
          h('span', null, 'icon'),
        ],
      },
    })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createContractComponent({ styling: { base: 'class-a' } })
    const BoxB = createContractComponent({ styling: { base: 'class-b' } })

    const Outer = defineComponent({
      setup() {
        return () =>
          h(
            box(BoxA),
            { asChild: true },
            {
              default: () => [h(box(BoxB), { asChild: true }, { default: () => [h('button')] })],
            },
          )
      },
    })

    const wrapper = mount(Outer)
    const el = wrapper.find('button')
    expect(el.element.className).toContain('class-a')
    expect(el.element.className).toContain('class-b')
  })

  // `compose`'s renders-through/tag-conflict/props-land/explicit-asChild-wins cases are covered
  // by the shared conformance suite (`conformance.test.ts` → `lib/adapter-utils/src/testing/
  // conformance.ts`, "conformance — compose"). This adapter keeps only the one case that suite
  // can't express generically: Vue's `ref` resolves to the component instance, not the host
  // element, so `onElement` (not `createRef`) is this adapter's real contract for reaching it.

  it('compose: onElement receives the composing component\'s own real element, not "with"\'s default tag', () => {
    // A plain `ref` on a Vue component resolves to the component instance, not the host
    // element — onElement is this adapter's actual contract for reaching the real DOM node
    // (see on-element.test.ts's own matrix, which this mirrors).
    let received: Element | undefined
    const BoxA = createContractComponent({ tag: 'nav' })
    const BoxB = createContractComponent({
      tag: 'button',
      compose: { with: BoxA },
      onElement: (el) => {
        received = el
      },
    })

    mount(box(BoxB))

    expect(received?.tagName.toLowerCase()).toBe('button')
  })
})

describe('createContractComponent — asChild VNode classification', () => {
  it('clones the element child even when a Text sibling is present (and warns it was dropped)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({ diagnostics: warnDiagnostics })

    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h('a', { href: '#x' }), createTextVNode('trailing')] },
    })

    expect(wrapper.element.tagName.toLowerCase()).toBe('a')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('non-element child'))
    warn.mockRestore()
  })

  it('ignores a Comment sibling (`v-if="false"`) — clones the element, no warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({ diagnostics: warnDiagnostics })

    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h(Comment, null, ''), h('button'), h(Comment, null, '')] },
    })

    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('rejects an asChild slot whose only child is a Text vnode', () => {
    const Box = createContractComponent({})
    expect(() =>
      mount(box(Box), {
        props: { asChild: true },
        slots: { default: () => [createTextVNode('just text')] },
      }),
    ).toThrow('asChild requires a VNode child')
  })

  it('clones a component child', () => {
    const Inner = defineComponent({
      name: 'Inner',
      setup: () => () => h('section', { id: 'inner' }),
    })
    const Box = createContractComponent({ styling: { base: 'box-cls' } })

    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h(Inner)] },
    })

    expect(wrapper.find('section#inner').exists()).toBe(true)
    expect(wrapper.element.className).toContain('box-cls')
  })
})

describe('createContractComponent — asChild prop merge', () => {
  it('chains an onClick handler with the child’s own (both fire)', async () => {
    const wrapperClick = vi.fn()
    const childClick = vi.fn()
    const Box = createContractComponent({})

    const wrapper = mount(box(Box), {
      props: { asChild: true, onClick: wrapperClick } as never,
      slots: { default: () => [h('button', { onClick: childClick })] },
    })

    await wrapper.get('button').trigger('click')
    expect(childClick).toHaveBeenCalledTimes(1)
    expect(wrapperClick).toHaveBeenCalledTimes(1)
  })

  it('merges a style object onto the child', () => {
    const Box = createContractComponent({})

    const wrapper = mount(box(Box), {
      props: { asChild: true, style: { color: 'red' } } as never,
      slots: { default: () => [h('button', { style: { fontWeight: 'bold' } })] },
    })

    const style = (wrapper.element as HTMLElement).style
    expect(style.color).toBe('red')
    expect(style.fontWeight).toBe('bold')
  })
})

describe('createContractComponent — reactivity', () => {
  it('does not re-run the resolution pipeline on an unrelated parent update', async () => {
    // `normalize` runs once per `prepareRenderState`, which is wrapped in `computed()`.
    const normalize = vi.fn((p: AnyRecord) => p)
    const Box = createContractComponent({ styling: { base: 'b' }, normalize } as never)

    const Parent = defineComponent({
      setup: () => ({ count: ref(0) }),
      render() {
        return h('div', [h(box(Box), { 'data-x': 'static' }), String(this.count)])
      },
    })

    const wrapper = mount(Parent)
    const afterMount = normalize.mock.calls.length
    expect(afterMount).toBeGreaterThan(0)

    ;(wrapper.vm as unknown as { count: number }).count = 3
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('3')
    expect(normalize.mock.calls.length).toBe(afterMount) // computed deps unchanged → cached
  })

  it('does re-run the pipeline when a prop it depends on actually changes', async () => {
    const normalize = vi.fn((p: AnyRecord) => p)
    const Box = createContractComponent({
      styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      normalize,
    } as never)
    const wrapper = mount(box(Box), { props: { size: 'sm' } as never })
    const before = normalize.mock.calls.length

    await wrapper.setProps({ size: 'lg' } as never)

    expect(normalize.mock.calls.length).toBeGreaterThan(before)
    expect(wrapper.element.className).toContain('text-lg')
  })
})

describe('createContractComponent — variants', () => {
  it('applies variant classes when variant props are passed', () => {
    const Box = createContractComponent({
      styling: {
        variants: {
          intent: { primary: 'bg-blue-500', secondary: 'bg-gray-500' },
        },
      },
    })
    const wrapper = mount(box(Box), { props: { intent: 'primary' } as never })
    expect(wrapper.element.className).toContain('bg-blue-500')
  })

  it('does not forward variant prop keys to the DOM', () => {
    const Box = createContractComponent({
      styling: { variants: { intent: { primary: 'bg-blue-500' } } },
    })
    const wrapper = mount(box(Box), { props: { intent: 'primary' } as never })
    expect(wrapper.element.getAttribute('intent')).toBeNull()
  })

  it('activates a preset via recipe', () => {
    const Box = createContractComponent({
      styling: {
        variants: {
          intent: { primary: 'bg-blue-500', secondary: 'bg-gray-500' },
          size: { sm: 'text-sm', lg: 'text-lg' },
        },
        presets: {
          cta: { intent: 'primary', size: 'lg' },
        } as never,
      },
    })
    const wrapper = mount(box(Box), { props: { recipe: 'cta' } as never })
    expect(wrapper.element.className).toContain('bg-blue-500')
    expect(wrapper.element.className).toContain('text-lg')
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
      const wrapper = mount(box(Box), {
        props: { ...displayProps, ...variantProps, layout, class: className } as AnyRecord,
      })
      return wrapper.element.className
    },
  },
  reactivity: async (steps) => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'base', plugin: createTailwindPipeline },
    })
    const wrapper = mount(box(Box), { props: {} })
    const snapshots: string[] = []
    for (const step of steps) {
      await wrapper.setProps({
        flex: false,
        'inline-flex': false,
        grid: false,
        'inline-grid': false,
        block: false,
        inline: false,
        hidden: false,
        ...(step.displayProps ?? {}),
        layout: step.layout,
        class: step.className,
      } as AnyRecord)
      snapshots.push(wrapper.element.className)
    }
    wrapper.unmount()
    return snapshots
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
    const wrapper = mount(box(Card), { props: { flex: true } })
    return {
      className: wrapper.element.className,
      flexAttribute: wrapper.element.getAttribute('flex'),
    }
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
    const wrapper = mount(box(Card))
    return fixture.result({
      className: wrapper.element.className,
      flexAttribute: wrapper.element.getAttribute('flex'),
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
    const wrapper = mount(box(Card))
    return {
      className: wrapper.element.className,
      flexAttribute: wrapper.element.getAttribute('flex'),
    }
  },
})

tailwindAsChildPluginParitySuite({
  renderPrimaryPluginAsChild: () => {
    const fixture = createComposeConflictFixture()
    const primary = createCountedPlugin(createTailwindPipeline)
    const Surface = createContractComponent({
      tag: 'div',
      styling: { base: 'partner-base', plugin: fixture.partnerPlugin },
    })
    fixture.afterPartner()
    const Card = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: fixture.diagnostics },
      compose: { with: Surface },
      styling: {
        base: 'primary-base grid-cols-3 gap-4',
        plugin: primary.plugin,
      },
    })
    const wrapper = mount(box(Card), {
      props: { asChild: true, flex: true, class: 'caller-class' } as AnyRecord,
      slots: { default: () => [h('button', { class: 'child-class' })] },
    })
    fixture.afterComposition()
    const result = fixture.result({
      className: wrapper.element.className,
      flexAttribute: wrapper.element.getAttribute('flex'),
    })
    return {
      className: result.className,
      flexAttribute: result.flexAttribute,
      partnerFactoryCallsDuringAsChild: result.partnerFactoryCallsDuringComposition,
      primaryFactoryCallsDuringAsChild: primary.calls(),
    }
  },
  renderNestedAsChild: () => {
    const fixture = createComposeConflictFixture()
    const primary = createCountedPlugin(createTailwindPipeline)
    const Surface = createContractComponent({
      tag: 'div',
      styling: { base: 'partner-base', plugin: fixture.partnerPlugin },
    })
    fixture.afterPartner()
    const Inner = createContractComponent({ tag: 'span', styling: { base: 'child-base' } })
    const Card = createContractComponent({
      tag: 'div',
      enforcement: { diagnostics: fixture.diagnostics },
      compose: { with: Surface },
      styling: {
        base: 'primary-base grid-cols-3 gap-4',
        plugin: primary.plugin,
      },
    })
    const wrapper = mount(box(Card), {
      props: { asChild: true, flex: true, class: 'caller-class' } as AnyRecord,
      slots: {
        default: () => [
          h(box(Inner), { asChild: true }, {
            default: () => [h('button', { class: 'child-class' })],
          }),
        ],
      },
    })
    fixture.afterComposition()
    // asChild collapses the wrappers: the mounted root element is the innermost <button>.
    const element = wrapper.element
    expect(element.tagName).toBe('BUTTON')
    const result = fixture.result({
      className: element.className,
      flexAttribute: element.getAttribute('flex'),
    })
    return {
      className: result.className,
      flexAttribute: result.flexAttribute,
      partnerFactoryCallsDuringAsChild: result.partnerFactoryCallsDuringComposition,
      primaryFactoryCallsDuringAsChild: primary.calls(),
    }
  },
})


tailwindPolymorphicElementParitySuite({
  render: ({ as, displayProps, className }) => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'base', plugin: createTailwindPipeline },
    })
    const wrapper = mount(box(Box), {
      props: {
        ...displayProps,
        ...(as === undefined ? {} : { as }),
        alt: as === 'img' ? '' : undefined,
        class: className,
      } as AnyRecord,
    })
    return {
      tagName: wrapper.element.tagName.toLowerCase(),
      className: wrapper.element.className,
      flexAttribute: wrapper.element.getAttribute('flex'),
    }
  },
  reactivity: async (steps) => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'base', plugin: createTailwindPipeline },
    })
    const wrapper = mount(box(Box), { props: {} })
    const results = []
    for (const step of steps) {
      await wrapper.setProps({
        flex: false,
        as: step.as,
        alt: step.as === 'img' ? '' : undefined,
        ...(step.displayProps ?? {}),
        class: step.className,
      } as AnyRecord)
      results.push({
        tagName: wrapper.element.tagName.toLowerCase(),
        className: wrapper.element.className,
        flexAttribute: wrapper.element.getAttribute('flex'),
      })
    }
    wrapper.unmount()
    return results
  },
})
