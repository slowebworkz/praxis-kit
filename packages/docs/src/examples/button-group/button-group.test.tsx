import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '../button/button'
import { ButtonGroup } from './button-group'

type AnyProps = Record<string, unknown>
const grp = (c: typeof ButtonGroup) => c as ComponentType<AnyProps>
const btn = (c: typeof Button) => c as ComponentType<AnyProps>

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

function group() {
  return container.querySelector('div')!
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ButtonGroup — rendering', () => {
  it('renders a <div> wrapper', () => {
    mount(createElement(grp(ButtonGroup), null, createElement(btn(Button), { key: 'a' })))
    expect(group()).toBeTruthy()
  })

  it('applies base flex classes', () => {
    mount(createElement(grp(ButtonGroup), null, createElement(btn(Button), { key: 'a' })))
    expect(group().className).toContain('inline-flex')
  })

  it('renders up to 4 Button children without error', () => {
    expect(() =>
      mount(
        createElement(
          grp(ButtonGroup),
          null,
          createElement(btn(Button), { key: 'a' }),
          createElement(btn(Button), { key: 'b' }),
          createElement(btn(Button), { key: 'c' }),
          createElement(btn(Button), { key: 'd' }),
        ),
      ),
    ).not.toThrow()
  })
})

// ─── childRules enforcement ───────────────────────────────────────────────────

describe('ButtonGroup — childRules enforcement', () => {
  it('throws when no Button children are provided', () => {
    expect(() => mount(createElement(grp(ButtonGroup), null))).toThrow(
      'ButtonGroup: "Button" requires at least 1.',
    )
  })

  it('throws when a non-Button child is mixed in', () => {
    expect(() =>
      mount(
        createElement(
          grp(ButtonGroup),
          null,
          createElement(btn(Button), { key: 'a' }),
          createElement('span', { key: 'x' }),
        ),
      ),
    ).toThrow('unexpected child')
  })

  it('throws when more than 4 Button children are provided', () => {
    expect(() =>
      mount(
        createElement(
          grp(ButtonGroup),
          null,
          createElement(btn(Button), { key: 'a' }),
          createElement(btn(Button), { key: 'b' }),
          createElement(btn(Button), { key: 'c' }),
          createElement(btn(Button), { key: 'd' }),
          createElement(btn(Button), { key: 'e' }),
        ),
      ),
    ).toThrow('ButtonGroup: "Button" allows at most 4.')
  })
})
