import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { Button } from '../button/button'
import { ButtonGroup } from './button-group'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(comp: unknown): any {
  return comp
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ButtonGroup — rendering', () => {
  it('renders a <div> wrapper', () => {
    const wrapper = mount(wrap(ButtonGroup), {
      slots: { default: () => [h(wrap(Button))] },
    })
    expect(wrapper.element.tagName.toLowerCase()).toBe('div')
  })

  it('applies base flex classes', () => {
    const wrapper = mount(wrap(ButtonGroup), {
      slots: { default: () => [h(wrap(Button))] },
    })
    expect(wrapper.element.className).toContain('inline-flex')
  })

  it('renders up to 4 Button children without error', () => {
    expect(() =>
      mount(wrap(ButtonGroup), {
        slots: {
          default: () => [h(wrap(Button)), h(wrap(Button)), h(wrap(Button)), h(wrap(Button))],
        },
      }),
    ).not.toThrow()
  })
})

// ─── childRules enforcement ───────────────────────────────────────────────────

describe('ButtonGroup — childRules enforcement', () => {
  it('warns when no Button children are provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(wrap(ButtonGroup))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"Button" requires at least 1'))
    warnSpy.mockRestore()
  })

  it('warns when a non-Button child is mixed in', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(wrap(ButtonGroup), {
      slots: { default: () => [h(wrap(Button)), h('span')] },
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unexpected child'))
    warnSpy.mockRestore()
  })

  it('warns when more than 4 Button children are provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(wrap(ButtonGroup), {
      slots: {
        default: () => [
          h(wrap(Button)),
          h(wrap(Button)),
          h(wrap(Button)),
          h(wrap(Button)),
          h(wrap(Button)),
        ],
      },
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"Button" allows at most 4'))
    warnSpy.mockRestore()
  })
})
