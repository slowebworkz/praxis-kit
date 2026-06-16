import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Landmark } from './landmark'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(comp: unknown): any {
  return comp
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Landmark — default rendering', () => {
  it('renders a <nav> element', () => {
    const wrapper = mount(wrap(Landmark))
    expect(wrapper.element.tagName.toLowerCase()).toBe('nav')
  })

  it('applies the base class', () => {
    const wrapper = mount(wrap(Landmark))
    expect(wrapper.element.className).toContain('block')
  })
})

// ─── ARIA auto-fix ────────────────────────────────────────────────────────────

describe('Landmark — ARIA auto-fix', () => {
  it('removes aria-checked (not valid on navigation role) from the DOM', () => {
    const wrapper = mount(wrap(Landmark), { attrs: { 'aria-checked': 'true' } })
    expect(wrapper.element.hasAttribute('aria-checked')).toBe(false)
  })

  it('keeps aria-label (global attribute) on the DOM', () => {
    const wrapper = mount(wrap(Landmark), { attrs: { 'aria-label': 'Site navigation' } })
    expect(wrapper.element.getAttribute('aria-label')).toBe('Site navigation')
  })

  it('removes role when it redundantly matches the implicit role', () => {
    const wrapper = mount(wrap(Landmark), { attrs: { role: 'navigation' } })
    expect(wrapper.element.hasAttribute('role')).toBe(false)
  })

  it('removes role="region" override on a strong implicit-role element', () => {
    const wrapper = mount(wrap(Landmark), { attrs: { role: 'region' } })
    expect(wrapper.element.hasAttribute('role')).toBe(false)
  })
})

// ─── ARIA warnings (strict: 'warn') ──────────────────────────────────────────

describe('Landmark — ARIA warnings', () => {
  it('warns when aria-checked is passed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(wrap(Landmark), { attrs: { 'aria-checked': 'true' } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"aria-checked" is not valid'))
    vi.restoreAllMocks()
  })

  it('warns on redundant role="navigation"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(wrap(Landmark), { attrs: { role: 'navigation' } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('already has implicit role'))
    vi.restoreAllMocks()
  })

  it('warns on role="region" override of a strong implicit role', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(wrap(Landmark), { attrs: { role: 'region' } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('should not override'))
    vi.restoreAllMocks()
  })

  it('does not warn for valid ARIA usage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(wrap(Landmark), { attrs: { 'aria-label': 'Primary navigation' } })
    expect(warn).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
