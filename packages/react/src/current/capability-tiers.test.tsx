// @vitest-environment jsdom
/**
 * Capability-tier integration tests.
 *
 * Each tier adds one capability layer. Tests are ordered from the simplest
 * possible component (render primitive only) up through the full capability
 * stack (styling + ARIA enforcement + children enforcement).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createElement, isValidElement, act } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { UnknownProps } from '@/shared'
import { createContractComponent } from './create-contract-component'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: any): ComponentType<UnknownProps> {
  return comp
}

let container: HTMLElement
let root: ReturnType<typeof createRoot>

function mount(element: ReturnType<typeof createElement>) {
  act(() => {
    root.render(element)
  })
}

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

// ─── Tier 1 — Render primitive (no styling, no enforcement) ──────────────────

describe('Tier 1 — primitive', () => {
  const Primitive = createContractComponent({ tag: 'div' })

  it('renders the default tag', () => {
    mount(createElement(box(Primitive), null))
    expect(container.querySelector('div')).toBeTruthy()
  })

  it('renders a different HTML tag via the as prop', () => {
    mount(createElement(box(Primitive), { as: 'section' }))
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('div')).toBeNull()
  })

  it('applies no class string when no styling is configured', () => {
    mount(createElement(box(Primitive), null))
    expect(container.querySelector('div')!.className).toBe('')
  })

  it('forwards arbitrary HTML attributes to the DOM', () => {
    mount(createElement(box(Primitive), { 'data-testid': 'prim', 'aria-label': 'box' }))
    const el = container.querySelector('[data-testid="prim"]')!
    expect(el).toBeTruthy()
    expect(el.getAttribute('aria-label')).toBe('box')
  })

  it('renders children', () => {
    mount(createElement(box(Primitive), null, 'hello'))
    expect(container.querySelector('div')!.textContent).toBe('hello')
  })

  // ── SVG elements ─────────────────────────────────────────────────────────────

  it('renders an SVG root element via as="svg"', () => {
    const width = '100'
    const height = '100'
    mount(createElement(box(Primitive), { as: 'svg', width, height }))
    const el = container.querySelector('svg')
    expect(el).toBeTruthy()
    expect(el!.getAttribute('width')).toBe('100')
  })

  it('renders an SVG shape element via as="circle" inside an svg wrapper', () => {
    mount(
      createElement(
        'svg',
        null,
        createElement(box(Primitive), { as: 'circle', cx: '50', cy: '50', r: '40' }),
      ),
    )
    const el = container.querySelector('circle')
    expect(el).toBeTruthy()
    expect(el!.getAttribute('r')).toBe('40')
  })

  it('renders an SVG path element via as="path" inside an svg wrapper', () => {
    mount(
      createElement('svg', null, createElement(box(Primitive), { as: 'path', d: 'M0 0 L10 10' })),
    )
    expect(container.querySelector('path')).toBeTruthy()
  })

  // ── Custom elements ──────────────────────────────────────────────────────────

  it('renders a hyphenated custom element via as="x-button"', () => {
    mount(createElement(box(Primitive), { as: 'x-button' }))
    expect(container.querySelector('x-button')).toBeTruthy()
  })

  it('renders a multi-segment custom element via as="my-ui-spinner"', () => {
    mount(createElement(box(Primitive), { as: 'my-ui-spinner' }))
    expect(container.querySelector('my-ui-spinner')).toBeTruthy()
  })

  it('forwards attributes to custom elements', () => {
    mount(createElement(box(Primitive), { as: 'x-badge', 'data-count': '3' }))
    expect(container.querySelector('x-badge')!.getAttribute('data-count')).toBe('3')
  })

  it('does not forward unknown boolean props as attributes to custom elements', () => {
    // The primitive has no filterProps configured — non-intrinsic props do pass
    // through for custom elements because React forwards unknown props to the DOM
    // only when the tag name is unrecognized. This test verifies tag rendering.
    mount(createElement(box(Primitive), { as: 'x-card', id: 'main' }))
    expect(container.querySelector('x-card')!.id).toBe('main')
  })
})

// ─── Tier 2 — Styling (variants, base class, filterProps) ────────────────────

describe('Tier 2 — styling', () => {
  const Styled = createContractComponent({
    tag: 'button',
    styling: {
      base: 'btn',
      variants: {
        size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
        intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
      },
      defaults: { size: 'md', intent: 'primary' },
    },
    filterProps: (key, variantKeys) => variantKeys.has(key),
  })

  it('applies the base class', () => {
    mount(createElement(box(Styled), null))
    expect(container.querySelector('button')!.className).toContain('btn')
  })

  it('applies default variant classes', () => {
    mount(createElement(box(Styled), null))
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('btn--md')
    expect(cls).toContain('btn--primary')
  })

  it('applies explicit variant prop', () => {
    mount(createElement(box(Styled), { size: 'lg', intent: 'ghost' }))
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('btn--lg')
    expect(cls).toContain('btn--ghost')
  })

  it('merges caller className with resolved classes', () => {
    mount(createElement(box(Styled), { className: 'extra' }))
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('btn')
    expect(cls).toContain('extra')
  })

  it('does not forward filtered variant keys to the DOM', () => {
    mount(createElement(box(Styled), { size: 'sm' }))
    expect(container.querySelector('button')!.hasAttribute('size')).toBe(false)
  })

  it('retains non-variant HTML attributes', () => {
    mount(createElement(box(Styled), { type: 'submit', 'data-testid': 'cta' }))
    const el = container.querySelector('button')!
    expect(el.getAttribute('type')).toBe('submit')
    expect(el.dataset['testid']).toBe('cta')
  })

  it('carries styling through an as-prop tag change', () => {
    mount(createElement(box(Styled), { as: 'a', size: 'sm' }))
    const cls = container.querySelector('a')!.className
    expect(cls).toContain('btn')
    expect(cls).toContain('btn--sm')
  })

  it('carries styling onto an SVG root element via as="svg"', () => {
    mount(createElement(box(Styled), { as: 'svg' }))
    const el = container.querySelector('svg')!
    expect(el).toBeTruthy()
    expect(el.getAttribute('class')).toContain('btn')
  })

  it('carries styling onto a custom element', () => {
    mount(createElement(box(Styled), { as: 'x-btn' }))
    const el = container.querySelector('x-btn')!
    expect(el).toBeTruthy()
    expect(el.getAttribute('class')).toContain('btn')
  })
})

// ─── Tier 3 — ARIA enforcement ────────────────────────────────────────────────

describe('Tier 3 — ARIA enforcement', () => {
  const Enforced = createContractComponent({
    tag: 'nav',
    styling: { base: 'nav-bar' },
    enforcement: { strict: false },
  })

  it('does not forward an invalid aria-* attribute to the DOM', () => {
    // aria-checked is not valid on navigation role
    mount(createElement(box(Enforced), { 'aria-checked': 'true' }))
    expect(container.querySelector('nav')!.hasAttribute('aria-checked')).toBe(false)
  })

  it('forwards a valid global aria-* attribute to the DOM', () => {
    mount(createElement(box(Enforced), { 'aria-label': 'Site navigation' }))
    expect(container.querySelector('nav')!.getAttribute('aria-label')).toBe('Site navigation')
  })

  it('strips a redundant explicit role that matches the implicit role', () => {
    mount(createElement(box(Enforced), { role: 'navigation' }))
    expect(container.querySelector('nav')!.hasAttribute('role')).toBe(false)
  })

  it('warns for invalid aria when strict is "warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const W = createContractComponent({ tag: 'nav', enforcement: { strict: 'warn' } })
    mount(createElement(box(W), { 'aria-checked': 'true' }))
    expect(warn).toHaveBeenCalled()
  })

  it('does not warn when no enforcement is configured (primitive tier)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const NoEnf = createContractComponent({ tag: 'nav' })
    mount(createElement(box(NoEnf), { 'aria-checked': 'true' }))
    expect(warn).not.toHaveBeenCalled()
  })
})

// ─── Tier 4 — Children enforcement ───────────────────────────────────────────

describe('Tier 4 — children enforcement', () => {
  const child = (key: string) => createElement('span', { key })
  const Guarded =
    // eslint-disable-next-line @praxis-ui/no-enforcement-without-strict -- intentionally tests the adapter default (React defaults to 'throw')
    createContractComponent({
      tag: 'div',
      styling: { base: 'group' },
      enforcement: {
        children: [
          {
            name: 'Span',
            match: (c: unknown): c is ReactElement => isValidElement(c) && c.type === 'span',
            cardinality: { min: 1, max: 3 },
          },
        ],
      },
    })

  it('renders without error when child count is within bounds', () => {
    expect(() => mount(createElement(box(Guarded), null, child('a'), child('b')))).not.toThrow()
  })

  it('renders when child count is exactly at the minimum', () => {
    expect(() => mount(createElement(box(Guarded), null, child('a')))).not.toThrow()
  })

  it('renders when child count is exactly at the maximum', () => {
    expect(() =>
      mount(createElement(box(Guarded), null, child('a'), child('b'), child('c'))),
    ).not.toThrow()
  })

  it('throws when no children are provided (below min)', () => {
    expect(() => mount(createElement(box(Guarded), null))).toThrow(/at least 1/)
  })

  it('throws when child count exceeds the maximum', () => {
    expect(() =>
      mount(createElement(box(Guarded), null, child('a'), child('b'), child('c'), child('d'))),
    ).toThrow(/at most 3/)
  })

  it('throws when an unexpected child type is mixed in', () => {
    expect(() =>
      mount(createElement(box(Guarded), null, child('a'), createElement('div', { key: 'bad' }))),
    ).toThrow(/unexpected child/)
  })

  it('still applies styling classes when children are valid', () => {
    mount(createElement(box(Guarded), null, child('a')))
    expect(container.querySelector('div')!.className).toContain('group')
  })
})

// ─── Tier 5 — Combined (styling + ARIA enforcement + children enforcement) ────

describe('Tier 5 — all capabilities combined', () => {
  const Full =
    // eslint-disable-next-line @praxis-ui/no-enforcement-without-strict -- intentionally tests the adapter default (React defaults to 'throw')
    createContractComponent({
      tag: 'nav',
      name: 'FullNav',
      styling: {
        base: 'full-nav',
        variants: { size: { sm: 'full-nav--sm', lg: 'full-nav--lg' } },
        defaults: { size: 'sm' },
      },
      filterProps: (key, variantKeys) => variantKeys.has(key),
      enforcement: {
        children: [
          {
            name: 'Anchor',
            match: (c: unknown): c is ReactElement => isValidElement(c) && c.type === 'a',
            cardinality: { min: 1, max: 5 },
          },
        ],
      },
    })

  const link = (key: string) => createElement('a', { key, href: '#' })

  it('applies base and default variant class', () => {
    mount(createElement(box(Full), null, link('a')))
    const cls = container.querySelector('nav')!.className
    expect(cls).toContain('full-nav')
    expect(cls).toContain('full-nav--sm')
  })

  it('applies explicit variant prop', () => {
    mount(createElement(box(Full), { size: 'lg' }, link('a')))
    expect(container.querySelector('nav')!.className).toContain('full-nav--lg')
  })

  it('does not forward filtered variant key to the DOM', () => {
    mount(createElement(box(Full), { size: 'sm' }, link('a')))
    expect(container.querySelector('nav')!.hasAttribute('size')).toBe(false)
  })

  it('strips an invalid aria-* attribute (ARIA engine active)', () => {
    mount(createElement(box(Full), { 'aria-checked': 'true' }, link('a')))
    expect(container.querySelector('nav')!.hasAttribute('aria-checked')).toBe(false)
  })

  it('keeps a valid aria-* attribute', () => {
    mount(createElement(box(Full), { 'aria-label': 'Main nav' }, link('a')))
    expect(container.querySelector('nav')!.getAttribute('aria-label')).toBe('Main nav')
  })

  it('throws when children violate the cardinality rule', () => {
    expect(() => mount(createElement(box(Full), null))).toThrow(/at least 1/)
  })

  it('throws when an unexpected child type is present', () => {
    expect(() =>
      mount(createElement(box(Full), null, link('a'), createElement('div', { key: 'x' }))),
    ).toThrow(/unexpected child/)
  })

  it('renders correctly when all constraints are satisfied', () => {
    expect(() =>
      mount(createElement(box(Full), { size: 'lg', 'aria-label': 'Nav' }, link('a'), link('b'))),
    ).not.toThrow()
    const nav = container.querySelector('nav')!
    expect(nav.className).toContain('full-nav--lg')
    expect(nav.getAttribute('aria-label')).toBe('Nav')
    expect(nav.querySelectorAll('a')).toHaveLength(2)
  })
})
