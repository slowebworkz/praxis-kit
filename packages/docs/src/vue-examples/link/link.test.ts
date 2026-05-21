import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { Link } from './link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(comp: unknown): any {
  return comp
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Link — default rendering', () => {
  it('renders an <a> element', () => {
    const wrapper = mount(wrap(Link))
    expect(wrapper.element.tagName.toLowerCase()).toBe('a')
  })

  it('applies base link classes', () => {
    const wrapper = mount(wrap(Link))
    expect(wrapper.element.className).toContain('text-blue-600')
  })

  it('forwards href to the anchor', () => {
    const wrapper = mount(wrap(Link), { attrs: { href: '/about' } })
    expect(wrapper.element.getAttribute('href')).toBe('/about')
  })
})

// ─── asChild pattern ──────────────────────────────────────────────────────────

describe('Link — asChild pattern', () => {
  it('renders the child element type instead of <a>', () => {
    const wrapper = mount(wrap(Link), {
      props: { asChild: true },
      slots: { default: () => [h('button', { type: 'button' })] },
    })
    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
  })

  it('merges Link classes onto the child element', () => {
    const wrapper = mount(wrap(Link), {
      props: { asChild: true },
      slots: { default: () => [h('button', { type: 'button' })] },
    })
    expect(wrapper.element.className).toContain('text-blue-600')
  })

  it('merges caller class with base classes on the child', () => {
    const wrapper = mount(wrap(Link), {
      props: { asChild: true, class: 'my-override' },
      slots: { default: () => [h('span')] },
    })
    expect(wrapper.element.className).toContain('text-blue-600')
    expect(wrapper.element.className).toContain('my-override')
  })
})

// ─── Polymorphic as prop ──────────────────────────────────────────────────────

describe('Link — polymorphic as prop', () => {
  it('renders <button> when as="button"', () => {
    const wrapper = mount(wrap(Link), { props: { as: 'button' } as never })
    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
  })

  it('carries base classes onto the rendered button', () => {
    const wrapper = mount(wrap(Link), { props: { as: 'button' } as never })
    expect(wrapper.element.className).toContain('text-blue-600')
  })
})
