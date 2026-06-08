import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type { AnyRecord } from '@praxis-kit/core'
import { Button } from '../button/button'
import { ButtonGroup } from './button-group'

const grp = (c: typeof ButtonGroup) => c as ComponentType<AnyRecord>
const btn = (c: typeof Button) => c as ComponentType<AnyRecord>

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
  it('warns when no Button children are provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(createElement(grp(ButtonGroup), null))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"Button" requires at least 1'))
    warnSpy.mockRestore()
  })

  it('warns when a non-Button child is mixed in', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      createElement(
        grp(ButtonGroup),
        null,
        createElement(btn(Button), { key: 'a' }),
        createElement('span', { key: 'x' }),
      ),
    )
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unexpected child'))
    warnSpy.mockRestore()
  })

  it('warns when more than 4 Button children are provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
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
    )
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"Button" allows at most 4'))
    warnSpy.mockRestore()
  })
})
