import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type { AnyRecord } from '@praxis-ui/core'
import { Landmark } from './landmark'

const box = (c: typeof Landmark) => c as ComponentType<AnyRecord>

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
  vi.restoreAllMocks()
})

function mount(el: ReturnType<typeof createElement>) {
  act(() => {
    root.render(el)
  })
}

function nav() {
  return container.querySelector('nav')!
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Landmark — default rendering', () => {
  it('renders a <nav> element', () => {
    mount(createElement(box(Landmark), null))
    expect(nav()).toBeTruthy()
  })

  it('applies the base class', () => {
    mount(createElement(box(Landmark), null))
    expect(nav().className).toContain('block')
  })
})

// ─── ARIA auto-fix ────────────────────────────────────────────────────────────

describe('Landmark — ARIA auto-fix', () => {
  it('removes aria-checked (not valid on navigation role) from the DOM', () => {
    mount(createElement(box(Landmark), { 'aria-checked': true }))
    expect(nav().hasAttribute('aria-checked')).toBe(false)
  })

  it('keeps aria-label (global attribute) on the DOM', () => {
    mount(createElement(box(Landmark), { 'aria-label': 'Site navigation' }))
    expect(nav().getAttribute('aria-label')).toBe('Site navigation')
  })

  it('removes role when it redundantly matches the implicit role', () => {
    mount(createElement(box(Landmark), { role: 'navigation' }))
    expect(nav().hasAttribute('role')).toBe(false)
  })

  it('removes role="region" override on a strong implicit-role element', () => {
    mount(createElement(box(Landmark), { role: 'region' }))
    expect(nav().hasAttribute('role')).toBe(false)
  })
})

// ─── ARIA warnings (strict: 'warn') ──────────────────────────────────────────

describe('Landmark — ARIA warnings', () => {
  it('warns when aria-checked is passed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mount(createElement(box(Landmark), { 'aria-checked': true }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"aria-checked" is not valid'))
  })

  it('warns on redundant role="navigation"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mount(createElement(box(Landmark), { role: 'navigation' }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already has implicit role'))
  })

  it('warns on role="region" override of a strong implicit role', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mount(createElement(box(Landmark), { role: 'region' }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('should not override'))
  })

  it('does not warn for valid ARIA usage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mount(createElement(box(Landmark), { 'aria-label': 'Primary navigation' }))
    expect(warn).not.toHaveBeenCalled()
  })
})
