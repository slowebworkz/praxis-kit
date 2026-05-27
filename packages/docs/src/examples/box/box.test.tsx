import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type { AnyRecord } from '@praxis-ui/core'
import { Box } from './box'

const box = (c: typeof Box) => c as ComponentType<AnyRecord>

let container: HTMLElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  document.body.removeChild(container)
})

function mount(el: ReturnType<typeof createElement>) {
  act(() => {
    root.render(el)
  })
}

function div() {
  return container.querySelector('div')!
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Box — default rendering', () => {
  it('renders a <div> element', () => {
    mount(createElement(box(Box), null))
    expect(div()).toBeTruthy()
  })

  it('applies no classes when no props are given', () => {
    mount(createElement(box(Box), null))
    expect(div().className).toBe('')
  })
})

// ─── Layout activation ────────────────────────────────────────────────────────

describe('Box — layout activation', () => {
  it('flex={true} adds the flex class', () => {
    mount(createElement(box(Box), { flex: true }))
    expect(div().className).toContain('flex')
  })

  it('grid={true} adds the grid class', () => {
    mount(createElement(box(Box), { grid: true }))
    expect(div().className).toContain('grid')
  })
})

// ─── Layout-mode filtering ────────────────────────────────────────────────────

describe('Box — layout-mode filtering', () => {
  it('flex mode retains flex-* direction classes', () => {
    mount(createElement(box(Box), { flex: true, direction: 'row' }))
    const cls = div().className
    expect(cls).toContain('flex')
    expect(cls).toContain('flex-row')
  })

  it('grid mode strips flex-* direction classes', () => {
    mount(createElement(box(Box), { grid: true, direction: 'row' }))
    expect(div().className).not.toContain('flex-row')
  })

  it('flex mode strips grid-cols-* classes', () => {
    mount(createElement(box(Box), { flex: true, cols: '2' }))
    expect(div().className).not.toContain('grid-cols-2')
  })

  it('grid mode retains grid-cols-* classes', () => {
    mount(createElement(box(Box), { grid: true, cols: '2' }))
    const cls = div().className
    expect(cls).toContain('grid')
    expect(cls).toContain('grid-cols-2')
  })

  it('flex mode retains gap classes', () => {
    mount(createElement(box(Box), { flex: true, gap: 'md' }))
    const cls = div().className
    expect(cls).toContain('flex')
    expect(cls).toContain('gap-4')
  })

  it('grid mode retains gap classes', () => {
    mount(createElement(box(Box), { grid: true, gap: 'lg' }))
    const cls = div().className
    expect(cls).toContain('grid')
    expect(cls).toContain('gap-8')
  })

  it('align classes pass through in both layout modes', () => {
    mount(createElement(box(Box), { flex: true, align: 'center' }))
    expect(div().className).toContain('items-center')
  })
})

// ─── Presets via variantKey ───────────────────────────────────────────────────

describe('Box — presets via variantKey', () => {
  it('row preset with flex applies row direction, center align, and md gap', () => {
    mount(createElement(box(Box), { variantKey: 'row', flex: true }))
    const cls = div().className
    expect(cls).toContain('flex')
    expect(cls).toContain('flex-row')
    expect(cls).toContain('items-center')
    expect(cls).toContain('gap-4')
  })

  it('stack preset with flex applies col direction and sm gap', () => {
    mount(createElement(box(Box), { variantKey: 'stack', flex: true }))
    const cls = div().className
    expect(cls).toContain('flex')
    expect(cls).toContain('flex-col')
    expect(cls).toContain('gap-2')
  })

  it('grid2 preset with grid applies grid-cols-2 and md gap', () => {
    mount(createElement(box(Box), { variantKey: 'grid2', grid: true }))
    const cls = div().className
    expect(cls).toContain('grid')
    expect(cls).toContain('grid-cols-2')
    expect(cls).toContain('gap-4')
  })

  it('explicit prop overrides active preset', () => {
    mount(createElement(box(Box), { variantKey: 'row', flex: true, align: 'start' }))
    const cls = div().className
    expect(cls).toContain('items-start')
    expect(cls).not.toContain('items-center')
  })
})

// ─── DOM forwarding ───────────────────────────────────────────────────────────

describe('Box — DOM forwarding', () => {
  it('flex is not forwarded as a DOM attribute', () => {
    mount(createElement(box(Box), { flex: true }))
    expect(div().hasAttribute('flex')).toBe(false)
  })

  it('grid is not forwarded as a DOM attribute', () => {
    mount(createElement(box(Box), { grid: true }))
    expect(div().hasAttribute('grid')).toBe(false)
  })

  it('direction is not forwarded as a DOM attribute', () => {
    mount(createElement(box(Box), { direction: 'row' }))
    expect(div().hasAttribute('direction')).toBe(false)
  })

  it('forwards standard HTML attributes to the DOM', () => {
    mount(createElement(box(Box), { 'data-testid': 'layout-box' }))
    expect(div().dataset['testid']).toBe('layout-box')
  })
})
