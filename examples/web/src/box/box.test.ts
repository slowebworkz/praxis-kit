import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { Box } from './box'

type WebEl = HTMLElement & { update(): void }

beforeAll(() => {
  customElements.define('example-box', Box as unknown as CustomElementConstructor)
})

afterEach(() => {
  document.body.innerHTML = ''
})

function mount(setup?: (el: HTMLElement) => void): HTMLElement {
  const el = document.createElement('example-box') as WebEl
  if (setup) setup(el)
  document.body.appendChild(el)
  return el
}

describe('Box — rendering', () => {
  it('mounts as a custom element', () => {
    const el = mount()
    expect(el.tagName.toLowerCase()).toBe('example-box')
  })
})

describe('Box — variants', () => {
  it('applies direction variant', () => {
    const el = mount((e) => e.setAttribute('direction', 'row'))
    expect(el.className).toContain('flex-row')
  })

  it('applies gap variant', () => {
    const el = mount((e) => e.setAttribute('gap', 'lg'))
    expect(el.className).toContain('gap-8')
  })

  it('applies align variant', () => {
    const el = mount((e) => e.setAttribute('align', 'center'))
    expect(el.className).toContain('items-center')
  })

  it('applies multiple variants', () => {
    const el = mount((e) => {
      e.setAttribute('direction', 'col')
      e.setAttribute('gap', 'sm')
    })
    expect(el.className).toContain('flex-col')
    expect(el.className).toContain('gap-2')
  })
})

describe('Box — presets', () => {
  it('row preset applies direction + align + gap', () => {
    const el = mount((e) => e.setAttribute('variant-key', 'row'))
    expect(el.className).toContain('flex-row')
    expect(el.className).toContain('items-center')
    expect(el.className).toContain('gap-4')
  })

  it('stack preset applies direction + gap', () => {
    const el = mount((e) => e.setAttribute('variant-key', 'stack'))
    expect(el.className).toContain('flex-col')
    expect(el.className).toContain('gap-2')
  })

  it('explicit prop overrides preset', () => {
    const el = mount((e) => {
      e.setAttribute('variant-key', 'row')
      e.setAttribute('gap', 'lg')
    })
    expect(el.className).toContain('gap-8')
    expect(el.className).not.toContain('gap-4')
  })
})
