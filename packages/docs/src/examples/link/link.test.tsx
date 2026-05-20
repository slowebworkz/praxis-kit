import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { Link } from './link'

type AnyProps = Record<string, unknown>
const box = (c: typeof Link) => c as ComponentType<AnyProps>

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

function anchor() {
  return container.querySelector('a')!
}

// ─── Default rendering ────────────────────────────────────────────────────────

describe('Link — default rendering', () => {
  it('renders an <a> element', () => {
    mount(createElement(box(Link), null))
    expect(anchor()).toBeTruthy()
  })

  it('applies base link classes', () => {
    mount(createElement(box(Link), null))
    expect(anchor().className).toContain('text-blue-600')
  })

  it('forwards href to the anchor', () => {
    mount(createElement(box(Link), { href: '/about' }))
    expect(anchor().getAttribute('href')).toBe('/about')
  })
})

// ─── asChild pattern ──────────────────────────────────────────────────────────

describe('Link — asChild pattern', () => {
  it('renders the child element type instead of <a>', () => {
    mount(createElement(box(Link), { asChild: true }, createElement('button', { type: 'button' })))
    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('a')).toBeNull()
  })

  it('merges Link classes onto the child element', () => {
    mount(createElement(box(Link), { asChild: true }, createElement('button', { type: 'button' })))
    expect(container.querySelector('button')!.className).toContain('text-blue-600')
  })

  it('merges caller className with base classes on the child', () => {
    mount(
      createElement(
        box(Link),
        { asChild: true, className: 'my-override' },
        createElement('span', null),
      ),
    )
    const span = container.querySelector('span')!
    expect(span.className).toContain('text-blue-600')
    expect(span.className).toContain('my-override')
  })
})

// ─── Polymorphic as prop ──────────────────────────────────────────────────────

describe('Link — polymorphic as prop', () => {
  it('renders <button> when as="button"', () => {
    mount(createElement(box(Link), { as: 'button' }))
    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('a')).toBeNull()
  })

  it('carries base classes onto the rendered button', () => {
    mount(createElement(box(Link), { as: 'button' }))
    expect(container.querySelector('button')!.className).toContain('text-blue-600')
  })
})
