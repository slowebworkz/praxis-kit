/**
 * Regression tests for the html enforcement false-positive bug:
 *
 * When a praxis-kit component renders as a tag with a built-in html contract
 * (e.g. <picture>), the html evaluator must recognise praxis-kit component
 * children as valid — not flag them as "unexpected children" because their
 * React type is a function rather than a string.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { createContractComponent } from '@praxis-kit/react'
import type { AnyRecord } from '@praxis-kit/core'

// Minimal picture compound. The built-in html contract for <picture> requires:
//   - zero or more <source> / metadata children
//   - exactly one <img>, and it must be last
const Picture = createContractComponent({ tag: 'picture', name: 'Picture' })
const Source = createContractComponent({ tag: 'source', name: 'Source' })
const Img = createContractComponent({ tag: 'img', name: 'Img' })

const pic = (c: typeof Picture) => c as ComponentType<AnyRecord>
const src = (c: typeof Source) => c as ComponentType<AnyRecord>
const img = (c: typeof Img) => c as ComponentType<AnyRecord>

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
  vi.restoreAllMocks()
})

function mount(el: ReturnType<typeof createElement>) {
  act(() => {
    root.render(el)
  })
}

describe('html enforcement — picture with component children', () => {
  it('does not warn when Source and Img are valid picture children', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      createElement(
        pic(Picture),
        null,
        createElement(src(Source), { key: 'src' }),
        createElement(img(Img), { key: 'img' }),
      ),
    )
    expect(warnSpy).toHaveBeenCalledTimes(0)
  })

  it('warns when a picture child is not a valid html element (e.g. <div>)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      createElement(
        pic(Picture),
        null,
        createElement('div', { key: 'bad' }),
        createElement(img(Img), { key: 'img' }),
      ),
    )
    expect(warnSpy).toHaveBeenCalled()
  })

  it('warns when img is not the last child', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      createElement(
        pic(Picture),
        null,
        createElement(img(Img), { key: 'img' }),
        createElement(src(Source), { key: 'src' }),
      ),
    )
    expect(warnSpy).toHaveBeenCalled()
  })

  it('does not warn when component children use explicit as prop matching their default tag', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      createElement(
        pic(Picture),
        null,
        createElement(src(Source), { key: 'src', as: 'source' }),
        createElement(img(Img), { key: 'img', as: 'img' }),
      ),
    )
    expect(warnSpy).toHaveBeenCalledTimes(0)
  })

  it('renders the expected DOM structure in the correct order', () => {
    mount(
      createElement(
        pic(Picture),
        null,
        createElement(src(Source), { key: 'src' }),
        createElement(img(Img), { key: 'img' }),
      ),
    )
    const picture = container.querySelector('picture')!
    expect(picture).toBeTruthy()
    expect(picture.children).toHaveLength(2)
    expect(picture.children[0]!.tagName).toBe('SOURCE')
    expect(picture.children[1]!.tagName).toBe('IMG')
  })
})
