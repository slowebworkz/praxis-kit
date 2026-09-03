import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { getChildRef } from './composeRefs'

// Plain-object constructors avoid React's frozen element props.
function makePlainElement(propsRef?: unknown): ReactElement {
  const props: Record<string, unknown> = {}
  if (propsRef !== undefined) props.ref = propsRef
  return { type: 'div', props, key: null } as unknown as ReactElement
}

function makePlainElementWithWarningOnPropsRef(elementRef?: unknown): ReactElement {
  const props: Record<string, unknown> = {}
  const fakeWarningGetter = Object.assign(() => {}, { isReactWarning: true })
  Object.defineProperty(props, 'ref', { get: fakeWarningGetter, configurable: true })
  const el: Record<string, unknown> = { type: 'div', props, key: null }
  if (elementRef !== undefined) el.ref = elementRef
  return el as unknown as ReactElement
}

describe('getChildRef — React 19 (current)', () => {
  it('returns null when element has no ref', () => {
    const el = makePlainElement()
    expect(getChildRef(el)).toBeNull()
  })

  it('reads ref from element.props when no warning getter is present', () => {
    const ref = { current: null }
    const el = makePlainElement(ref)
    expect(getChildRef(el)).toBe(ref)
  })

  it('falls back to element.ref when props.ref carries a React warning getter', () => {
    const realRef = { current: null }
    const el = makePlainElementWithWarningOnPropsRef(realRef)
    expect(getChildRef(el)).toBe(realRef)
  })

  it('returns null when props.ref has a warning getter and element.ref is absent', () => {
    const el = makePlainElementWithWarningOnPropsRef()
    expect(getChildRef(el)).toBeNull()
  })

  it('reads a callback ref from props', () => {
    const ref = () => {}
    const el = makePlainElement(ref)
    expect(getChildRef(el)).toBe(ref)
  })

  it('returns null when given a real createElement element with no ref', () => {
    const el = createElement('div')
    expect(getChildRef(el)).toBeNull()
  })
})
