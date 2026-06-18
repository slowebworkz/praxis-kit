// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createElement, Fragment, createRef } from 'react'
import { box, useReactDom } from '../shared/test-utils'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

describe('createContractComponent (legacy / React 18)', () => {
  it('sets displayName', () => {
    const Comp = createContractComponent({ name: 'MyBox' })
    expect(Comp.displayName).toBe('MyBox')
  })

  it('renders the default tag (div)', () => {
    const Box = createContractComponent({})
    dom.mount(createElement(box(Box), null))
    expect(dom.container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createContractComponent({})
    dom.mount(createElement(box(Box), { as: 'section' }))
    expect(dom.container.querySelector('section')).toBeTruthy()
  })

  it('forwards a ref to the DOM element via forwardRef', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLDivElement>()
    dom.mount(createElement(box(Box), { ref }))
    expect(ref.current).toBe(dom.container.querySelector('div'))
  })

  it('renders children', () => {
    const Box = createContractComponent({})
    dom.mount(createElement(box(Box), null, createElement('span', { id: 'child' })))
    expect(dom.container.querySelector('span#child')).toBeTruthy()
  })

  it('asChild renders the child element type', () => {
    const Box = createContractComponent({})
    dom.mount(
      createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })),
    )
    expect(dom.container.querySelector('button')).toBeTruthy()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createContractComponent({ styling: { base: 'legacy-cls' } })
    dom.mount(createElement(box(Box), { asChild: true }, createElement('button')))
    expect(dom.container.querySelector('button')!.className).toContain('legacy-cls')
  })

  // In React 19, Children.toArray no longer flattens Fragments — both legacy and
  // current adapters treat a Fragment as a single opaque element. The flattening
  // behavior that distinguished legacy only existed in React 18.
  it('fragment with multiple children does not throw in React 19 (no flattening)', () => {
    const Box = createContractComponent({})
    const fragment = createElement(Fragment, null, createElement('span'), createElement('div'))
    expect(() => dom.mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createContractComponent({ styling: { base: 'class-a' } })
    const BoxB = createContractComponent({ styling: { base: 'class-b' } })
    dom.mount(
      createElement(
        box(BoxA),
        { asChild: true },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
      ),
    )
    const el = dom.container.querySelector('button')!
    expect(el.className).toContain('class-a')
    expect(el.className).toContain('class-b')
  })

  it('nested asChild: ref from outer component reaches the innermost element', () => {
    const BoxA = createContractComponent({})
    const BoxB = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()
    dom.mount(
      createElement(
        box(BoxA),
        { asChild: true, ref },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
      ),
    )
    expect(ref.current).toBe(dom.container.querySelector('button'))
  })

  it('applies filterProps', () => {
    const Box = createContractComponent({
      filterProps: (key: string) => key === 'size',
    })
    dom.mount(createElement(box(Box), { size: 'lg', 'data-keep': 'yes' } as never))
    const el = dom.container.querySelector('div')!
    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })
})
