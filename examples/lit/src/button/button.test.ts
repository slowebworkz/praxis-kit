import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { Button } from './button'

type LitEl = HTMLElement & { updateComplete: Promise<boolean>; requestUpdate(): void }

beforeAll(() => {
  customElements.define('example-button', Button as unknown as CustomElementConstructor)
})

afterEach(() => {
  document.body.innerHTML = ''
})

async function mount(setup?: (el: HTMLElement) => void): Promise<HTMLElement> {
  const el = document.createElement('example-button') as LitEl
  document.body.appendChild(el)
  await el.updateComplete
  if (setup) {
    setup(el)
    el.requestUpdate()
    await el.updateComplete
  }
  return el
}

describe('Button — base class and defaults', () => {
  it('applies base class', async () => {
    const el = await mount()
    expect(el.className).toContain('inline-flex')
  })

  it('applies default intent and size', async () => {
    const el = await mount()
    expect(el.className).toContain('bg-gray-100')
    expect(el.className).toContain('px-4')
  })
})

describe('Button — variants', () => {
  it('applies primary intent', async () => {
    const el = await mount((e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('bg-blue-600')
    expect(el.className).not.toContain('bg-gray-100')
  })

  it('applies sm size', async () => {
    const el = await mount((e) => e.setAttribute('size', 'sm'))
    expect(el.className).toContain('px-2')
    expect(el.className).not.toContain('px-4')
  })
})

describe('Button — presets', () => {
  it('cta preset applies primary + lg', async () => {
    const el = await mount((e) => e.setAttribute('variant-key', 'cta'))
    expect(el.className).toContain('bg-blue-600')
    expect(el.className).toContain('px-6')
  })

  it('subtle preset applies ghost + sm', async () => {
    const el = await mount((e) => e.setAttribute('variant-key', 'subtle'))
    expect(el.className).toContain('bg-transparent')
    expect(el.className).toContain('px-2')
  })
})

describe('Button — reactivity', () => {
  it('updates when intent changes', async () => {
    const el = document.createElement('example-button') as LitEl
    document.body.appendChild(el)
    await el.updateComplete

    el.setAttribute('intent', 'primary')
    el.requestUpdate()
    await el.updateComplete
    expect(el.className).toContain('bg-blue-600')

    el.setAttribute('intent', 'ghost')
    el.requestUpdate()
    await el.updateComplete
    expect(el.className).toContain('bg-transparent')
    expect(el.className).not.toContain('bg-blue-600')
  })
})

describe('Button — ARIA', () => {
  it('forwards aria-label', async () => {
    const el = await mount((e) => e.setAttribute('aria-label', 'Close'))
    expect(el.getAttribute('aria-label')).toBe('Close')
  })

  it('forwards disabled attribute', async () => {
    const el = await mount((e) => e.setAttribute('disabled', ''))
    expect(el.hasAttribute('disabled')).toBe(true)
  })
})
