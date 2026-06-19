import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
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
