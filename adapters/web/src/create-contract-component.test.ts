import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import {
  BoxElement,
  ButtonElement,
  NavElement,
  TabsRootElement,
  TabsTriggerElement,
  TabsContentElement,
} from './test-components'

type WebEl = HTMLElement & { update(): void }

beforeAll(() => {
  if (!customElements.get('web-box'))
    customElements.define('web-box', BoxElement as unknown as CustomElementConstructor)
  if (!customElements.get('web-button'))
    customElements.define('web-button', ButtonElement as unknown as CustomElementConstructor)
  if (!customElements.get('web-nav'))
    customElements.define('web-nav', NavElement as unknown as CustomElementConstructor)
  if (!customElements.get('web-tabs-root'))
    customElements.define('web-tabs-root', TabsRootElement as unknown as CustomElementConstructor)
  if (!customElements.get('web-tabs-trigger'))
    customElements.define(
      'web-tabs-trigger',
      TabsTriggerElement as unknown as CustomElementConstructor,
    )
  if (!customElements.get('web-tabs-content'))
    customElements.define(
      'web-tabs-content',
      TabsContentElement as unknown as CustomElementConstructor,
    )
})

afterEach(() => {
  document.body.innerHTML = ''
})

function mount(tag: string, setup?: (el: HTMLElement) => void): HTMLElement {
  const el = document.createElement(tag) as WebEl
  if (setup) setup(el)
  document.body.appendChild(el)
  return el
}

function update(el: HTMLElement, fn: (el: HTMLElement) => void): void {
  fn(el)
  ;(el as WebEl).update()
}

// ─── Box ─────────────────────────────────────────────────────────────────────

describe('Box — base class', () => {
  it('applies base class on mount', () => {
    const el = mount('web-box')
    expect(el.className).toContain('box-base')
  })
})

describe('Box — variants', () => {
  it('applies direction variant', () => {
    const el = mount('web-box', (e) => e.setAttribute('direction', 'row'))
    expect(el.className).toContain('flex-row')
  })

  it('applies gap variant', () => {
    const el = mount('web-box', (e) => e.setAttribute('gap', 'lg'))
    expect(el.className).toContain('gap-8')
  })

  it('updates when variant attribute changes', () => {
    const el = mount('web-box', (e) => e.setAttribute('direction', 'row'))
    expect(el.className).toContain('flex-row')

    el.setAttribute('direction', 'col')
    expect(el.className).toContain('flex-col')
    expect(el.className).not.toContain('flex-row')
  })

  it('applies multiple variants', () => {
    const el = mount('web-box', (e) => {
      e.setAttribute('direction', 'col')
      e.setAttribute('gap', 'sm')
    })
    expect(el.className).toContain('flex-col')
    expect(el.className).toContain('gap-2')
  })
})

describe('Box — presets', () => {
  it('row preset applies direction + gap', () => {
    const el = mount('web-box', (e) => e.setAttribute('variant-key', 'row'))
    expect(el.className).toContain('flex-row')
    expect(el.className).toContain('gap-4')
  })

  it('explicit prop overrides preset', () => {
    const el = mount('web-box', (e) => {
      e.setAttribute('variant-key', 'row')
      e.setAttribute('gap', 'lg')
    })
    expect(el.className).toContain('gap-8')
    expect(el.className).not.toContain('gap-4')
  })
})

// ─── Button ──────────────────────────────────────────────────────────────────

describe('Button — defaults', () => {
  it('applies default size and intent', () => {
    const el = mount('web-button')
    expect(el.className).toContain('btn-base')
    expect(el.className).toContain('btn-md')
    expect(el.className).toContain('btn-ghost')
  })
})

describe('Button — variants', () => {
  it('applies primary intent', () => {
    const el = mount('web-button', (e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('btn-primary')
    expect(el.className).not.toContain('btn-ghost')
  })

  it('applies sm size', () => {
    const el = mount('web-button', (e) => e.setAttribute('size', 'sm'))
    expect(el.className).toContain('btn-sm')
    expect(el.className).not.toContain('btn-md')
  })
})

describe('Button — presets', () => {
  it('cta preset applies primary + lg', () => {
    const el = mount('web-button', (e) => e.setAttribute('variant-key', 'cta'))
    expect(el.className).toContain('btn-primary')
    expect(el.className).toContain('btn-lg')
  })

  it('subtle preset applies ghost + sm', () => {
    const el = mount('web-button', (e) => e.setAttribute('variant-key', 'subtle'))
    expect(el.className).toContain('btn-ghost')
    expect(el.className).toContain('btn-sm')
  })
})

describe('Button — reactivity', () => {
  it('updates when intent changes', () => {
    const el = mount('web-button', (e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('btn-primary')

    el.setAttribute('intent', 'ghost')
    expect(el.className).toContain('btn-ghost')
    expect(el.className).not.toContain('btn-primary')
  })
})

// ─── Nav — ARIA ──────────────────────────────────────────────────────────────

describe('Nav — ARIA pipeline', () => {
  it('preserves aria-label on a nav element', () => {
    const el = mount('web-nav', (e) => e.setAttribute('aria-label', 'Main'))
    update(el, () => {})
    expect(el.getAttribute('aria-label')).toBe('Main')
  })

  it('strips redundant role="navigation" from a <nav> element', () => {
    const el = mount('web-nav', (e) => e.setAttribute('role', 'navigation'))
    update(el, () => {})
    expect(el.getAttribute('role')).toBeNull()
  })
})

// ─── update() — non-reactive attributes ──────────────────────────────────────

describe('update() — manual pipeline trigger', () => {
  it('processes aria-* attributes set after mount', () => {
    const el = mount('web-nav')
    el.setAttribute('aria-label', 'Secondary')
    ;(el as WebEl).update()
    expect(el.getAttribute('aria-label')).toBe('Secondary')
  })

  it('strips aria attribute removed by the engine after update()', () => {
    const el = mount('web-nav')
    el.setAttribute('role', 'navigation')
    ;(el as WebEl).update()
    expect(el.getAttribute('role')).toBeNull()
  })
})

// ─── Tabs — children enforcement ─────────────────────────────────────────────

describe('Tabs — children enforcement', () => {
  it('resolves successfully when required children are present', () => {
    const root = document.createElement('web-tabs-root')
    root.appendChild(document.createElement('web-tabs-trigger'))
    root.appendChild(document.createElement('web-tabs-content'))
    expect(() => document.body.appendChild(root)).not.toThrow()
  })

  it('throws when required children are missing (strict: throw)', () => {
    const root = document.createElement('web-tabs-root')
    // Test via update() without connecting to DOM: jsdom wraps errors thrown from
    // connectedCallback in a microtask chain that creates unhandled rejections.
    // update() calls _applyPraxis() directly in synchronous test scope.
    expect(() => (root as WebEl).update()).toThrow()
  })
})
