import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import { createPolymorphicComponent } from './create-polymorphic-component'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: unknown): any {
  return comp
}

describe('createPolymorphicComponent — displayName', () => {
  it('sets displayName on the component', () => {
    const Comp = createPolymorphicComponent({ name: 'MyBox' })
    expect((Comp as { displayName?: string }).displayName).toBe('MyBox')
  })

  it('falls back to PolymorphicComponent when displayName is omitted', () => {
    const Comp = createPolymorphicComponent({})
    expect((Comp as { displayName?: string }).displayName).toBe('PolymorphicComponent')
  })
})

describe('createPolymorphicComponent — tag rendering', () => {
  it('renders the default tag (div)', () => {
    const Box = createPolymorphicComponent({})
    const wrapper = mount(box(Box))
    expect(wrapper.element.tagName.toLowerCase()).toBe('div')
  })

  it('renders a different tag via the as prop', () => {
    const Box = createPolymorphicComponent({})
    const wrapper = mount(box(Box), { props: { as: 'section' } })
    expect(wrapper.element.tagName.toLowerCase()).toBe('section')
  })

  it('respects a custom defaultTag', () => {
    const Box = createPolymorphicComponent({ tag: 'span' })
    const wrapper = mount(box(Box))
    expect(wrapper.element.tagName.toLowerCase()).toBe('span')
  })
})

describe('createPolymorphicComponent — class merging', () => {
  it('applies baseClassName', () => {
    const Box = createPolymorphicComponent({ styling: { base: 'base-cls' } })
    const wrapper = mount(box(Box))
    expect(wrapper.element.className).toBe('base-cls')
  })

  it('merges caller class with baseClassName', () => {
    const Box = createPolymorphicComponent({ styling: { base: 'base' } })
    const wrapper = mount(box(Box), { props: { class: 'extra' } })
    expect(wrapper.element.className).toContain('base')
    expect(wrapper.element.className).toContain('extra')
  })
})

describe('createPolymorphicComponent — attrs', () => {
  it('forwards extra attrs to the DOM element', () => {
    const Box = createPolymorphicComponent({})
    const wrapper = mount(box(Box), { attrs: { 'data-testid': 'box' } })
    expect(wrapper.element.getAttribute('data-testid')).toBe('box')
  })

  it('strips variant keys before DOM forwarding', () => {
    const Box = createPolymorphicComponent({
      styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
    })
    const wrapper = mount(box(Box), { props: { size: 'lg' } as never })
    expect(wrapper.element.getAttribute('size')).toBeNull()
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createPolymorphicComponent({
      filterProps: (key: string) => key === 'loading',
    })
    const wrapper = mount(box(Box), { attrs: { loading: 'true', 'data-keep': 'yes' } })
    expect(wrapper.element.getAttribute('loading')).toBeNull()
    expect(wrapper.element.getAttribute('data-keep')).toBe('yes')
  })
})

describe('createPolymorphicComponent — children', () => {
  it('renders slot children', () => {
    const Box = createPolymorphicComponent({})
    const wrapper = mount(box(Box), {
      slots: { default: () => [h('span', { id: 'child' })] },
    })
    expect(wrapper.find('span#child').exists()).toBe(true)
  })
})

describe('createPolymorphicComponent — asChild', () => {
  it('renders the slot child element type instead of the default tag', () => {
    const Box = createPolymorphicComponent({})
    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h('button', { type: 'button' })] },
    })
    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('merges baseClassName onto the asChild element', () => {
    const Box = createPolymorphicComponent({ styling: { base: 'box-cls' } })
    const wrapper = mount(box(Box), {
      props: { asChild: true },
      slots: { default: () => [h('button')] },
    })
    expect(wrapper.element.className).toContain('box-cls')
  })

  it('throws when asChild has zero children', () => {
    const Box = createPolymorphicComponent({})
    expect(() =>
      mount(box(Box), {
        props: { asChild: true },
        slots: { default: () => [] },
      }),
    ).toThrow('asChild requires exactly one VNode child, got 0')
  })

  it('throws when as and asChild are both provided', () => {
    const Box = createPolymorphicComponent({})
    expect(() =>
      mount(box(Box), {
        props: { as: 'button', asChild: true },
        slots: { default: () => [h('a', { href: '/' })] },
      }),
    ).toThrow('"as" and "asChild" are mutually exclusive')
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createPolymorphicComponent({ styling: { base: 'class-a' } })
    const BoxB = createPolymorphicComponent({ styling: { base: 'class-b' } })

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

describe('createPolymorphicComponent — variants', () => {
  it('applies variant classes when variant props are passed', () => {
    const Box = createPolymorphicComponent({
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
    const Box = createPolymorphicComponent({
      styling: { variants: { intent: { primary: 'bg-blue-500' } } },
    })
    const wrapper = mount(box(Box), { props: { intent: 'primary' } as never })
    expect(wrapper.element.getAttribute('intent')).toBeNull()
  })

  it('activates a preset via variantKey', () => {
    const Box = createPolymorphicComponent({
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
    const wrapper = mount(box(Box), { props: { variantKey: 'cta' } as never })
    expect(wrapper.element.className).toContain('bg-blue-500')
    expect(wrapper.element.className).toContain('text-lg')
  })
})
