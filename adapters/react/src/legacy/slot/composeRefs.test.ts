import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { getChildRef } from './composeRefs'

// Plain-object constructors avoid React's frozen element structure.
function makePlainElement(elementRef?: unknown, propsRef?: unknown): ReactElement {
  const props: Record<string, unknown> = {}
  if (propsRef !== undefined) props.ref = propsRef
  const el: Record<string, unknown> = { type: 'div', props, key: null }
  if (elementRef !== undefined) el.ref = elementRef
  return el as unknown as ReactElement
}

function makePlainElementWithWarningOnElementRef(propsRef?: unknown): ReactElement {
  const props: Record<string, unknown> = {}
  if (propsRef !== undefined) props.ref = propsRef
  const el: Record<string, unknown> = { type: 'div', props, key: null }
  const fakeWarningGetter = Object.assign(() => {}, { isReactWarning: true })
  Object.defineProperty(el, 'ref', { get: fakeWarningGetter, configurable: true })
  return el as unknown as ReactElement
}

describe('getChildRef — React 18 (legacy)', () => {
  it('returns null when element has no ref', () => {
    const el = makePlainElement()
    expect(getChildRef(el)).toBeNull()
  })

  it('reads ref from element.ref when no warning getter is present', () => {
    const ref = { current: null }
    const el = makePlainElement(ref)
    expect(getChildRef(el)).toBe(ref)
  })

  it('falls back to props.ref when element.ref carries a React warning getter', () => {
    const realRef = { current: null }
    const el = makePlainElementWithWarningOnElementRef(realRef)
    expect(getChildRef(el)).toBe(realRef)
  })

  it('returns null when element.ref has a warning getter and props.ref is absent', () => {
    const el = makePlainElementWithWarningOnElementRef()
    expect(getChildRef(el)).toBeNull()
  })

  it('reads a callback ref from element.ref', () => {
    const ref = () => {}
    const el = makePlainElement(ref)
    expect(getChildRef(el)).toBe(ref)
  })

  it('returns null when given a real createElement element with no ref', () => {
    const el = createElement('div')
    expect(getChildRef(el)).toBeNull()
  })
})
