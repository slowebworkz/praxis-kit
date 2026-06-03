import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { Button } from './button'

type WebEl = HTMLElement & { update(): void }

beforeAll(() => {
  customElements.define('example-button', Button as unknown as CustomElementConstructor)
})

afterEach(() => {
  document.body.innerHTML = ''
})

function mount(setup?: (el: HTMLElement) => void): HTMLElement {
  const el = document.createElement('example-button') as WebEl
  if (setup) setup(el)
  document.body.appendChild(el)
  return el
}

describe('Button — base class and defaults', () => {
  it('applies base class', () => {
    const el = mount()
    expect(el.className).toContain('inline-flex')
  })

  it('applies default intent and size', () => {
    const el = mount()
    expect(el.className).toContain('bg-gray-100')
    expect(el.className).toContain('px-4')
  })
})

describe('Button — variants', () => {
  it('applies primary intent', () => {
    const el = mount((e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('bg-blue-600')
    expect(el.className).not.toContain('bg-gray-100')
  })

  it('applies sm size', () => {
    const el = mount((e) => e.setAttribute('size', 'sm'))
    expect(el.className).toContain('px-2')
    expect(el.className).not.toContain('px-4')
  })
})

describe('Button — presets', () => {
  it('cta preset applies primary + lg', () => {
    const el = mount((e) => e.setAttribute('variant-key', 'cta'))
    expect(el.className).toContain('bg-blue-600')
    expect(el.className).toContain('px-6')
  })

  it('subtle preset applies ghost + sm', () => {
    const el = mount((e) => e.setAttribute('variant-key', 'subtle'))
    expect(el.className).toContain('bg-transparent')
    expect(el.className).toContain('px-2')
  })
})

describe('Button — reactivity', () => {
  it('updates when intent changes', () => {
    const el = mount((e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('bg-blue-600')

    el.setAttribute('intent', 'ghost')
    expect(el.className).toContain('bg-transparent')
    expect(el.className).not.toContain('bg-blue-600')
  })
})

describe('Button — ARIA', () => {
  it('forwards aria-label', () => {
    const el = mount((e) => e.setAttribute('aria-label', 'Close'))
    ;(el as WebEl).update()
    expect(el.getAttribute('aria-label')).toBe('Close')
  })

  it('forwards disabled attribute', () => {
    const el = mount((e) => e.setAttribute('disabled', ''))
    ;(el as WebEl).update()
    expect(el.hasAttribute('disabled')).toBe(true)
  })
})
