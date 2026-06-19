import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Box } from './box'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(comp: unknown): any {
  return comp
}

function div(wrapper: ReturnType<typeof mount>): HTMLElement {
  return wrapper.element as HTMLElement
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Box — default rendering', () => {
  it('renders a <div> element', () => {
    const wrapper = mount(wrap(Box))
    expect(wrapper.element.tagName.toLowerCase()).toBe('div')
  })

  it('applies no classes when no props are given', () => {
    const wrapper = mount(wrap(Box))
    expect(div(wrapper).className).toBe('')
  })
})

// ─── Layout activation ────────────────────────────────────────────────────────

describe('Box — layout activation', () => {
  it('flex=true adds the flex class', () => {
    const wrapper = mount(wrap(Box), { props: { flex: true } as never })
    expect(div(wrapper).className).toContain('flex')
  })

  it('grid=true adds the grid class', () => {
    const wrapper = mount(wrap(Box), { props: { grid: true } as never })
    expect(div(wrapper).className).toContain('grid')
  })
})

// ─── Layout-mode filtering ────────────────────────────────────────────────────

describe('Box — layout-mode filtering', () => {
  it('flex mode retains flex-* direction classes', () => {
    const wrapper = mount(wrap(Box), { props: { flex: true, direction: 'row' } as never })
    const cls = div(wrapper).className
    expect(cls).toContain('flex')
    expect(cls).toContain('flex-row')
  })

  it('grid mode strips flex-* direction classes', () => {
    const wrapper = mount(wrap(Box), { props: { grid: true, direction: 'row' } as never })
    expect(div(wrapper).className).not.toContain('flex-row')
  })

  it('flex mode strips grid-cols-* classes', () => {
    const wrapper = mount(wrap(Box), { props: { flex: true, cols: '2' } as never })
    expect(div(wrapper).className).not.toContain('grid-cols-2')
  })

  it('grid mode retains grid-cols-* classes', () => {
    const wrapper = mount(wrap(Box), { props: { grid: true, cols: '2' } as never })
    const cls = div(wrapper).className
    expect(cls).toContain('grid')
    expect(cls).toContain('grid-cols-2')
  })

  it('flex mode retains gap classes', () => {
    const wrapper = mount(wrap(Box), { props: { flex: true, gap: 'md' } as never })
    const cls = div(wrapper).className
    expect(cls).toContain('flex')
    expect(cls).toContain('gap-4')
  })

  it('grid mode retains gap classes', () => {
    const wrapper = mount(wrap(Box), { props: { grid: true, gap: 'lg' } as never })
    const cls = div(wrapper).className
    expect(cls).toContain('grid')
    expect(cls).toContain('gap-8')
  })

  it('align classes pass through in flex mode', () => {
    const wrapper = mount(wrap(Box), { props: { flex: true, align: 'center' } as never })
    expect(div(wrapper).className).toContain('items-center')
  })
})

// ─── Presets via recipe ───────────────────────────────────────────────────

describe('Box — presets via recipe', () => {
  it('row preset with flex applies row direction, center align, and md gap', () => {
    const wrapper = mount(wrap(Box), {
      props: { recipe: 'row', flex: true } as never,
    })
    const cls = div(wrapper).className
    expect(cls).toContain('flex')
    expect(cls).toContain('flex-row')
    expect(cls).toContain('items-center')
    expect(cls).toContain('gap-4')
  })

  it('stack preset with flex applies col direction and sm gap', () => {
    const wrapper = mount(wrap(Box), {
      props: { recipe: 'stack', flex: true } as never,
    })
    const cls = div(wrapper).className
    expect(cls).toContain('flex')
    expect(cls).toContain('flex-col')
    expect(cls).toContain('gap-2')
  })

  it('grid mode with cols=2 applies grid-cols-2 and md gap', () => {
    const wrapper = mount(wrap(Box), {
      props: { grid: true, cols: '2', gap: 'md' } as never,
    })
    const cls = div(wrapper).className
    expect(cls).toContain('grid')
    expect(cls).toContain('grid-cols-2')
    expect(cls).toContain('gap-4')
  })

  it('explicit prop overrides active preset', () => {
    const wrapper = mount(wrap(Box), {
      props: { recipe: 'row', flex: true, align: 'start' } as never,
    })
    const cls = div(wrapper).className
    expect(cls).toContain('items-start')
    expect(cls).not.toContain('items-center')
  })
})

// ─── DOM forwarding ───────────────────────────────────────────────────────────

describe('Box — DOM forwarding', () => {
  it('flex is not forwarded as a DOM attribute', () => {
    const wrapper = mount(wrap(Box), { props: { flex: true } as never })
    expect(div(wrapper).hasAttribute('flex')).toBe(false)
  })

  it('grid is not forwarded as a DOM attribute', () => {
    const wrapper = mount(wrap(Box), { props: { grid: true } as never })
    expect(div(wrapper).hasAttribute('grid')).toBe(false)
  })

  it('direction is not forwarded as a DOM attribute', () => {
    const wrapper = mount(wrap(Box), { props: { direction: 'row' } as never })
    expect(div(wrapper).hasAttribute('direction')).toBe(false)
  })

  it('forwards standard HTML attributes to the DOM', () => {
    const wrapper = mount(wrap(Box), { attrs: { 'data-testid': 'layout-box' } })
    expect(div(wrapper).dataset['testid']).toBe('layout-box')
  })
})
