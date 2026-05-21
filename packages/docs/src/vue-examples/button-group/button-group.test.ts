import { describe, it, expect } from 'vitest'
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
  it('throws when no Button children are provided', () => {
    expect(() => mount(wrap(ButtonGroup))).toThrow('ButtonGroup: "Button" requires at least 1.')
  })

  it('throws when a non-Button child is mixed in', () => {
    expect(() =>
      mount(wrap(ButtonGroup), {
        slots: { default: () => [h(wrap(Button)), h('span')] },
      }),
    ).toThrow('unexpected child')
  })

  it('throws when more than 4 Button children are provided', () => {
    expect(() =>
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
      }),
    ).toThrow('ButtonGroup: "Button" allows at most 4.')
  })
})
