import { describe, expect, it, vi } from 'vitest'
import { createElement, Fragment, isValidElement } from 'react'
import type { ReactElement } from 'react'
import type { UnknownProps } from '../types'
import type { CloneSlotChildFn } from './types'
import { applySlot } from './applySlot'
import { Slottable } from './Slottable'

const div = (props: UnknownProps = {}) => createElement('div', props)
const span = (props: UnknownProps = {}) => createElement('span', props)

const identity: CloneSlotChildFn = ({ child }) => child

const capturing: CloneSlotChildFn = ({ child, slotProps }) => {
  const merged = { ...(child.props as UnknownProps), ...slotProps }
  return createElement(child.type as string, merged)
}

describe('applySlot — plain element child', () => {
  it('clones the child with slot props when given a plain element', () => {
    const child = div({ id: 'target' })
    const slotProps: UnknownProps = { className: 'slot-class' }
    const result = applySlot(child, slotProps, null, capturing)
    expect(result.type).toBe('div')
    expect((result.props as UnknownProps).id).toBe('target')
    expect((result.props as UnknownProps).className).toBe('slot-class')
  })

  it('passes the ref through to the clone function', () => {
    const cloneFn = vi.fn().mockImplementation(identity)
    const ref = { current: null }
    applySlot(div(), {}, ref, cloneFn as unknown as CloneSlotChildFn)
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ ref }))
  })

  it('throws when children is not a valid element', () => {
    expect(() => applySlot('not an element', {}, null, identity)).toThrow(
      'Slot: child must be a valid React element',
    )
  })

  it('throws when children is null', () => {
    expect(() => applySlot(null, {}, null, identity)).toThrow(
      'Slot: child must be a valid React element',
    )
  })
})

describe('applySlot — Slottable sibling pattern', () => {
  it('extracts the Slottable child, clones it, and rebuilds the Fragment', () => {
    const inner = div({ id: 'inner' })
    const sibling = span({ 'aria-hidden': true } as UnknownProps)
    const slottable = createElement(Slottable, null, inner)
    const result = applySlot([sibling, slottable], { className: 'merged' }, null, capturing)
    expect(result.type).toBe(Fragment)
    const children = (result.props as { children: ReactElement[] }).children
    expect(children[0]).toBe(sibling)
    const merged = children[1]!
    expect(isValidElement(merged)).toBe(true)
    expect((merged.props as UnknownProps).id).toBe('inner')
    expect((merged.props as UnknownProps).className).toBe('merged')
  })

  it('passes ref to clone when Slottable is present', () => {
    const inner = div()
    const slottable = createElement(Slottable, null, inner)
    const cloneFn = vi.fn().mockImplementation(identity)
    const ref = { current: null }
    applySlot([span(), slottable], {}, ref, cloneFn as unknown as CloneSlotChildFn)
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ ref }))
  })
})
