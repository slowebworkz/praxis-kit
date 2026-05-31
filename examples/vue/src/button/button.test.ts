import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Button } from './button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(comp: unknown): any {
  return comp
}

function button(wrapper: ReturnType<typeof mount>) {
  return wrapper.element as HTMLButtonElement
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Button — default rendering', () => {
  it('renders a <button> element', () => {
    const wrapper = mount(wrap(Button))
    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
  })

  it('applies the base class', () => {
    const wrapper = mount(wrap(Button))
    expect(button(wrapper).className).toContain('inline-flex')
  })

  it('applies default variant classes', () => {
    const wrapper = mount(wrap(Button))
    // defaultVariants: intent=secondary, size=md
    expect(button(wrapper).className).toContain('bg-gray-100')
    expect(button(wrapper).className).toContain('px-4')
  })
})

// ─── Variant props ────────────────────────────────────────────────────────────

describe('Button — variant props', () => {
  it('applies primary intent classes', () => {
    const wrapper = mount(wrap(Button), { props: { intent: 'primary' } as never })
    expect(button(wrapper).className).toContain('bg-blue-600')
  })

  it('applies ghost intent classes', () => {
    const wrapper = mount(wrap(Button), { props: { intent: 'ghost' } as never })
    expect(button(wrapper).className).toContain('bg-transparent')
  })

  it('applies sm size classes', () => {
    const wrapper = mount(wrap(Button), { props: { size: 'sm' } as never })
    expect(button(wrapper).className).toContain('px-2')
  })

  it('applies lg size classes', () => {
    const wrapper = mount(wrap(Button), { props: { size: 'lg' } as never })
    expect(button(wrapper).className).toContain('px-6')
  })
})

// ─── Preset (variantKey) ──────────────────────────────────────────────────────

describe('Button — preset via variantKey', () => {
  it('cta preset applies primary intent and lg size', () => {
    const wrapper = mount(wrap(Button), { props: { variantKey: 'cta' } as never })
    expect(button(wrapper).className).toContain('bg-blue-600')
    expect(button(wrapper).className).toContain('px-6')
  })

  it('subtle preset applies ghost intent and sm size', () => {
    const wrapper = mount(wrap(Button), { props: { variantKey: 'subtle' } as never })
    expect(button(wrapper).className).toContain('bg-transparent')
    expect(button(wrapper).className).toContain('px-2')
  })

  it('explicit props override the active preset', () => {
    const wrapper = mount(wrap(Button), {
      props: { variantKey: 'cta', intent: 'ghost' } as never,
    })
    expect(button(wrapper).className).toContain('bg-transparent')
    expect(button(wrapper).className).not.toContain('bg-blue-600')
  })
})

// ─── filterProps — no variant or owned props leak to the DOM ─────────────────

describe('Button — filterProps', () => {
  it('does not set intent as a DOM attribute', () => {
    const wrapper = mount(wrap(Button), { props: { intent: 'primary' } as never })
    expect(button(wrapper).hasAttribute('intent')).toBe(false)
  })

  it('does not set size as a DOM attribute', () => {
    const wrapper = mount(wrap(Button), { props: { size: 'lg' } as never })
    expect(button(wrapper).hasAttribute('size')).toBe(false)
  })

  it('does not set loading as a DOM attribute', () => {
    const wrapper = mount(wrap(Button), { attrs: { loading: 'true' } })
    expect(button(wrapper).hasAttribute('loading')).toBe(false)
  })

  it('does not set variantKey as a DOM attribute', () => {
    const wrapper = mount(wrap(Button), { props: { variantKey: 'cta' } as never })
    expect(button(wrapper).hasAttribute('variantKey')).toBe(false)
  })

  it('forwards standard HTML attributes to the DOM', () => {
    const wrapper = mount(wrap(Button), {
      attrs: { disabled: true, 'data-testid': 'btn' },
    })
    expect((button(wrapper) as HTMLButtonElement).disabled).toBe(true)
    expect(button(wrapper).dataset['testid']).toBe('btn')
  })
})

// ─── Polymorphic rendering ────────────────────────────────────────────────────

describe('Button — polymorphic as prop', () => {
  it('renders an <a> element when as="a"', () => {
    const wrapper = mount(wrap(Button), { props: { as: 'a' } as never })
    expect(wrapper.element.tagName.toLowerCase()).toBe('a')
  })

  it('carries variant classes onto the rendered anchor', () => {
    const wrapper = mount(wrap(Button), { props: { as: 'a', intent: 'primary' } as never })
    expect(wrapper.element.className).toContain('bg-blue-600')
  })
})
