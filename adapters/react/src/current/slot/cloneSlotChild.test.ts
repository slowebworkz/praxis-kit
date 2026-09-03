import { describe, expect, it } from 'vitest'
import { createElement, Fragment } from 'react'
import type { UnknownProps } from '../../shared'
import { cloneSlotChild } from './cloneSlotChild'
import { div } from '../../shared/test-utils'

describe('cloneSlotChild — React 19 (current)', () => {
  it('merges slotProps into child props', () => {
    const child = div({ id: 'target' })
    const result = cloneSlotChild({ child, slotProps: { className: 'slot' }, ref: null })
    expect((result.props as UnknownProps).id).toBe('target')
    expect((result.props as UnknownProps).className).toBe('slot')
  })

  it('child props win over slotProps on shared keys', () => {
    const child = div({ id: 'child-id' })
    const result = cloneSlotChild({ child, slotProps: { id: 'slot-id' }, ref: null })
    expect((result.props as UnknownProps).id).toBe('child-id')
  })

  it('attaches a ref when provided', () => {
    const ref = { current: null }
    const child = div()
    const result = cloneSlotChild({ child, slotProps: {}, ref })
    expect((result.props as UnknownProps).ref).toBe(ref)
  })

  it('does not attach ref when ref is null', () => {
    const child = div()
    const result = cloneSlotChild({ child, slotProps: {}, ref: null })
    expect((result.props as UnknownProps).ref).toBeUndefined()
  })

  it('does not attach ref to Fragment children', () => {
    const inner = div()
    const fragment = createElement(Fragment, null, inner)
    const ref = { current: null }
    const result = cloneSlotChild({ child: fragment, slotProps: { id: 'slot' }, ref })
    // Fragment cannot hold a ref — ref must be absent
    expect((result.props as UnknownProps).ref).toBeUndefined()
  })

  it('merges slotProps onto Fragment children', () => {
    const inner = div()
    const fragment = createElement(Fragment, null, inner)
    const result = cloneSlotChild({ child: fragment, slotProps: { 'data-x': '1' }, ref: null })
    expect(result.type).toBe(Fragment)
    expect((result.props as UnknownProps)['data-x']).toBe('1')
  })

  it('composes existing child ref with the provided ref', () => {
    const existingRef = { current: null }
    const slotRef = { current: null }
    const child = div({ ref: existingRef })
    const result = cloneSlotChild({ child, slotProps: {}, ref: slotRef })
    // The merged ref is a callback that sets both refs
    const mergedRef = (result.props as UnknownProps).ref
    expect(typeof mergedRef).toBe('function')
    const node = document.createElement('div')
    ;(mergedRef as (v: unknown) => void)(node)
    expect(existingRef.current).toBe(node)
    expect(slotRef.current).toBe(node)
  })
})
