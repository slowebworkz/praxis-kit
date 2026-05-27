import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type { AnyRecord } from '@praxis-ui/core'
import { Button } from './button'

const box = (c: typeof Button) => c as ComponentType<AnyRecord>

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

function button() {
  return container.querySelector('button')!
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Button — default rendering', () => {
  it('renders a <button> element', () => {
    mount(createElement(box(Button), null))
    expect(button()).toBeTruthy()
  })

  it('applies the base class', () => {
    mount(createElement(box(Button), null))
    expect(button().className).toContain('inline-flex')
  })

  it('applies default variant classes', () => {
    mount(createElement(box(Button), null))
    // defaultVariants: intent=secondary, size=md
    expect(button().className).toContain('bg-gray-100')
    expect(button().className).toContain('px-4')
  })
})

// ─── Variant props ────────────────────────────────────────────────────────────

describe('Button — variant props', () => {
  it('applies primary intent classes', () => {
    mount(createElement(box(Button), { intent: 'primary' }))
    expect(button().className).toContain('bg-blue-600')
  })

  it('applies ghost intent classes', () => {
    mount(createElement(box(Button), { intent: 'ghost' }))
    expect(button().className).toContain('bg-transparent')
  })

  it('applies sm size classes', () => {
    mount(createElement(box(Button), { size: 'sm' }))
    expect(button().className).toContain('px-2')
  })

  it('applies lg size classes', () => {
    mount(createElement(box(Button), { size: 'lg' }))
    expect(button().className).toContain('px-6')
  })
})

// ─── Preset (variantKey) ──────────────────────────────────────────────────────

describe('Button — preset via variantKey', () => {
  it('cta preset applies primary intent and lg size', () => {
    mount(createElement(box(Button), { variantKey: 'cta' }))
    expect(button().className).toContain('bg-blue-600')
    expect(button().className).toContain('px-6')
  })

  it('subtle preset applies ghost intent and sm size', () => {
    mount(createElement(box(Button), { variantKey: 'subtle' }))
    expect(button().className).toContain('bg-transparent')
    expect(button().className).toContain('px-2')
  })

  it('explicit props override the active preset', () => {
    // cta is primary/lg — overriding intent to ghost at call site
    mount(createElement(box(Button), { variantKey: 'cta', intent: 'ghost' }))
    expect(button().className).toContain('bg-transparent')
    expect(button().className).not.toContain('bg-blue-600')
  })
})

// ─── filterProps — no variant or owned props leak to the DOM ─────────────────

describe('Button — filterProps', () => {
  it('does not set intent as a DOM attribute', () => {
    mount(createElement(box(Button), { intent: 'primary' }))
    expect(button().hasAttribute('intent')).toBe(false)
  })

  it('does not set size as a DOM attribute', () => {
    mount(createElement(box(Button), { size: 'lg' }))
    expect(button().hasAttribute('size')).toBe(false)
  })

  it('does not set loading as a DOM attribute', () => {
    mount(createElement(box(Button), { loading: true }))
    expect(button().hasAttribute('loading')).toBe(false)
  })

  it('does not set variantKey as a DOM attribute', () => {
    mount(createElement(box(Button), { variantKey: 'cta' }))
    expect(button().hasAttribute('variantKey')).toBe(false)
  })

  it('forwards standard HTML attributes to the DOM', () => {
    mount(createElement(box(Button), { disabled: true, 'data-testid': 'btn' }))
    expect(button().disabled).toBe(true)
    expect(button().dataset['testid']).toBe('btn')
  })
})

// ─── Polymorphic rendering ────────────────────────────────────────────────────

describe('Button — polymorphic as prop', () => {
  it('renders an <a> element when as="a"', () => {
    mount(createElement(box(Button), { as: 'a', href: '/' }))
    expect(container.querySelector('a')).toBeTruthy()
    expect(container.querySelector('button')).toBeNull()
  })

  it('carries variant classes onto the rendered anchor', () => {
    mount(createElement(box(Button), { as: 'a', intent: 'primary' }))
    expect(container.querySelector('a')!.className).toContain('bg-blue-600')
  })
})
