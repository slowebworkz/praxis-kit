import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Comment, createTextVNode, defineComponent, h, ref } from 'vue'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'

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
    const normalize = vi.fn((p: Record<string, unknown>) => p)
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
    const normalize = vi.fn((p: Record<string, unknown>) => p)
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
