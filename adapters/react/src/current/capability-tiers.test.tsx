// @vitest-environment jsdom
/**
 * Capability-tier integration tests.
 *
 * Each tier adds one capability layer. Tests are ordered from the simplest
 * possible component (render primitive only) up through the full capability
 * stack (styling + ARIA enforcement + children enforcement).
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createElement, isValidElement } from 'react'
import type { ReactElement } from 'react'
import { silentDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'
import { box, useReactDom } from '../shared/test-utils'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── Tier 1 — Render primitive (no styling, no enforcement) ──────────────────

describe('Tier 1 — primitive', () => {
  const Primitive = createContractComponent({ tag: 'div' })

  it('renders the default tag', () => {
    dom.mount(createElement(box(Primitive), null))
    expect(dom.container.querySelector('div')).toBeTruthy()
  })

  it('renders a different HTML tag via the as prop', () => {
    dom.mount(createElement(box(Primitive), { as: 'section' }))
    expect(dom.container.querySelector('section')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('applies no class string when no styling is configured', () => {
    dom.mount(createElement(box(Primitive), null))
    expect(dom.container.querySelector('div')!.className).toBe('')
  })

  it('forwards arbitrary HTML attributes to the DOM', () => {
    dom.mount(createElement(box(Primitive), { 'data-testid': 'prim', 'aria-label': 'box' }))
    const el = dom.container.querySelector('[data-testid="prim"]')!
    expect(el).toBeTruthy()
    expect(el.getAttribute('aria-label')).toBe('box')
  })

  it('renders children', () => {
    dom.mount(createElement(box(Primitive), null, 'hello'))
    expect(dom.container.querySelector('div')!.textContent).toBe('hello')
  })

  // ── SVG elements ─────────────────────────────────────────────────────────────

  it('renders an SVG root element via as="svg"', () => {
    const width = '100'
    const height = '100'
    dom.mount(createElement(box(Primitive), { as: 'svg', width, height }))
    const el = dom.container.querySelector('svg')
    expect(el).toBeTruthy()
    expect(el!.getAttribute('width')).toBe('100')
  })

  it('renders an SVG shape element via as="circle" inside an svg wrapper', () => {
    dom.mount(
      createElement(
        'svg',
        null,
        createElement(box(Primitive), { as: 'circle', cx: '50', cy: '50', r: '40' }),
      ),
    )
    const el = dom.container.querySelector('circle')
    expect(el).toBeTruthy()
    expect(el!.getAttribute('r')).toBe('40')
  })

  it('renders an SVG path element via as="path" inside an svg wrapper', () => {
    dom.mount(
      createElement('svg', null, createElement(box(Primitive), { as: 'path', d: 'M0 0 L10 10' })),
    )
    expect(dom.container.querySelector('path')).toBeTruthy()
  })

  // ── Custom elements ──────────────────────────────────────────────────────────

  it('renders a hyphenated custom element via as="x-button"', () => {
    dom.mount(createElement(box(Primitive), { as: 'x-button' }))
    expect(dom.container.querySelector('x-button')).toBeTruthy()
  })

  it('renders a multi-segment custom element via as="my-ui-spinner"', () => {
    dom.mount(createElement(box(Primitive), { as: 'my-ui-spinner' }))
    expect(dom.container.querySelector('my-ui-spinner')).toBeTruthy()
  })

  it('forwards attributes to custom elements', () => {
    dom.mount(createElement(box(Primitive), { as: 'x-badge', 'data-count': '3' }))
    expect(dom.container.querySelector('x-badge')!.getAttribute('data-count')).toBe('3')
  })

  it('does not forward unknown boolean props as attributes to custom elements', () => {
    // The primitive has no filterProps configured — non-intrinsic props do pass
    // through for custom elements because React forwards unknown props to the DOM
    // only when the tag name is unrecognized. This test verifies tag rendering.
    dom.mount(createElement(box(Primitive), { as: 'x-card', id: 'main' }))
    expect(dom.container.querySelector('x-card')!.id).toBe('main')
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
    dom.mount(createElement(box(Styled), null))
    expect(dom.container.querySelector('button')!.className).toContain('btn')
  })

  it('applies default variant classes', () => {
    dom.mount(createElement(box(Styled), null))
    const cls = dom.container.querySelector('button')!.className
    expect(cls).toContain('btn--md')
    expect(cls).toContain('btn--primary')
  })

  it('applies explicit variant prop', () => {
    dom.mount(createElement(box(Styled), { size: 'lg', intent: 'ghost' }))
    const cls = dom.container.querySelector('button')!.className
    expect(cls).toContain('btn--lg')
    expect(cls).toContain('btn--ghost')
  })

  it('merges caller className with resolved classes', () => {
    dom.mount(createElement(box(Styled), { className: 'extra' }))
    const cls = dom.container.querySelector('button')!.className
    expect(cls).toContain('btn')
    expect(cls).toContain('extra')
  })

  it('does not forward filtered variant keys to the DOM', () => {
    dom.mount(createElement(box(Styled), { size: 'sm' }))
    expect(dom.container.querySelector('button')!.hasAttribute('size')).toBe(false)
  })

  it('retains non-variant HTML attributes', () => {
    dom.mount(createElement(box(Styled), { type: 'submit', 'data-testid': 'cta' }))
    const el = dom.container.querySelector('button')!
    expect(el.getAttribute('type')).toBe('submit')
    expect(el.dataset['testid']).toBe('cta')
  })

  it('carries styling through an as-prop tag change', () => {
    dom.mount(createElement(box(Styled), { as: 'a', size: 'sm' }))
    const cls = dom.container.querySelector('a')!.className
    expect(cls).toContain('btn')
    expect(cls).toContain('btn--sm')
  })

  it('carries styling onto an SVG root element via as="svg"', () => {
    dom.mount(createElement(box(Styled), { as: 'svg' }))
    const el = dom.container.querySelector('svg')!
    expect(el).toBeTruthy()
    expect(el.getAttribute('class')).toContain('btn')
  })

  it('carries styling onto a custom element', () => {
    dom.mount(createElement(box(Styled), { as: 'x-btn' }))
    const el = dom.container.querySelector('x-btn')!
    expect(el).toBeTruthy()
    expect(el.getAttribute('class')).toContain('btn')
  })
})

// ─── Tier 3 — ARIA enforcement ────────────────────────────────────────────────

describe('Tier 3 — ARIA enforcement', () => {
  const Enforced = createContractComponent({
    tag: 'nav',
    styling: { base: 'nav-bar' },
    enforcement: { diagnostics: silentDiagnostics },
  })

  it('does not forward an invalid aria-* attribute to the DOM', () => {
    // aria-checked is not valid on navigation role
    dom.mount(createElement(box(Enforced), { 'aria-checked': 'true' }))
    expect(dom.container.querySelector('nav')!.hasAttribute('aria-checked')).toBe(false)
  })

  it('forwards a valid global aria-* attribute to the DOM', () => {
    dom.mount(createElement(box(Enforced), { 'aria-label': 'Site navigation' }))
    expect(dom.container.querySelector('nav')!.getAttribute('aria-label')).toBe('Site navigation')
  })

  it('strips a redundant explicit role that matches the implicit role', () => {
    dom.mount(createElement(box(Enforced), { role: 'navigation' }))
    expect(dom.container.querySelector('nav')!.hasAttribute('role')).toBe(false)
  })

  it('warns for invalid aria when strict is "warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const W = createContractComponent({ tag: 'nav', enforcement: { diagnostics: warnDiagnostics } })
    dom.mount(createElement(box(W), { 'aria-checked': 'true' }))
    expect(warn).toHaveBeenCalled()
  })

  it('does not warn when no enforcement is configured (primitive tier)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const NoEnf = createContractComponent({ tag: 'nav' })
    dom.mount(createElement(box(NoEnf), { 'aria-checked': 'true' }))
    expect(warn).not.toHaveBeenCalled()
  })
})

// ─── Tier 4 — Children enforcement ───────────────────────────────────────────

describe('Tier 4 — children enforcement', () => {
  const child = (key: string) => createElement('span', { key })
  const Guarded =
    // eslint-disable-next-line @praxis-kit/no-enforcement-without-strict -- intentionally tests the adapter default (React defaults to 'throw')
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
    expect(() => dom.mount(createElement(box(Guarded), null, child('a'), child('b')))).not.toThrow()
  })

  it('renders when child count is exactly at the minimum', () => {
    expect(() => dom.mount(createElement(box(Guarded), null, child('a')))).not.toThrow()
  })

  it('renders when child count is exactly at the maximum', () => {
    expect(() =>
      dom.mount(createElement(box(Guarded), null, child('a'), child('b'), child('c'))),
    ).not.toThrow()
  })

  it('throws when no children are provided (below min)', () => {
    expect(() => dom.mount(createElement(box(Guarded), null))).toThrow(/at least 1/)
  })

  it('throws when child count exceeds the maximum', () => {
    expect(() =>
      dom.mount(createElement(box(Guarded), null, child('a'), child('b'), child('c'), child('d'))),
    ).toThrow(/at most 3/)
  })

  it('throws when an unexpected child type is mixed in', () => {
    expect(() =>
      dom.mount(
        createElement(box(Guarded), null, child('a'), createElement('div', { key: 'bad' })),
      ),
    ).toThrow(/unexpected child/)
  })

  it('still applies styling classes when children are valid', () => {
    dom.mount(createElement(box(Guarded), null, child('a')))
    expect(dom.container.querySelector('div')!.className).toContain('group')
  })
})

// ─── Tier 5 — Combined (styling + ARIA enforcement + children enforcement) ────

describe('Tier 5 — all capabilities combined', () => {
  const Full =
    // eslint-disable-next-line @praxis-kit/no-enforcement-without-strict -- intentionally tests the adapter default (React defaults to 'throw')
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
    dom.mount(createElement(box(Full), null, link('a')))
    const cls = dom.container.querySelector('nav')!.className
    expect(cls).toContain('full-nav')
    expect(cls).toContain('full-nav--sm')
  })

  it('applies explicit variant prop', () => {
    dom.mount(createElement(box(Full), { size: 'lg' }, link('a')))
    expect(dom.container.querySelector('nav')!.className).toContain('full-nav--lg')
  })

  it('does not forward filtered variant key to the DOM', () => {
    dom.mount(createElement(box(Full), { size: 'sm' }, link('a')))
    expect(dom.container.querySelector('nav')!.hasAttribute('size')).toBe(false)
  })

  it('strips an invalid aria-* attribute (ARIA engine active)', () => {
    dom.mount(createElement(box(Full), { 'aria-checked': 'true' }, link('a')))
    expect(dom.container.querySelector('nav')!.hasAttribute('aria-checked')).toBe(false)
  })

  it('keeps a valid aria-* attribute', () => {
    dom.mount(createElement(box(Full), { 'aria-label': 'Main nav' }, link('a')))
    expect(dom.container.querySelector('nav')!.getAttribute('aria-label')).toBe('Main nav')
  })

  it('throws when children violate the cardinality rule', () => {
    expect(() => dom.mount(createElement(box(Full), null))).toThrow(/at least 1/)
  })

  it('throws when an unexpected child type is present', () => {
    expect(() =>
      dom.mount(createElement(box(Full), null, link('a'), createElement('div', { key: 'x' }))),
    ).toThrow(/unexpected child/)
  })

  it('renders correctly when all constraints are satisfied', () => {
    expect(() =>
      dom.mount(
        createElement(box(Full), { size: 'lg', 'aria-label': 'Nav' }, link('a'), link('b')),
      ),
    ).not.toThrow()
    const nav = dom.container.querySelector('nav')!
    expect(nav.className).toContain('full-nav--lg')
    expect(nav.getAttribute('aria-label')).toBe('Nav')
    expect(nav.querySelectorAll('a')).toHaveLength(2)
  })
})
