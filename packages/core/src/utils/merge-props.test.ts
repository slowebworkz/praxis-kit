import { describe, expect, it } from 'vitest'
import { mergeProps } from './merge-props'

describe('mergeProps', () => {
  it('returns props alone when defaultProps is undefined', () => {
    expect(mergeProps(undefined, { a: 1 })).toEqual({ a: 1 })
  })

  it('merges defaultProps with props', () => {
    expect(mergeProps({ a: 1, b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('props override defaultProps for shared keys', () => {
    expect(mergeProps({ a: 1, b: 2 }, { b: 99 })).toEqual({ a: 1, b: 99 })
  })

  it('does not mutate defaultProps', () => {
    const defaults = { a: 1 }
    mergeProps(defaults, { b: 2 })
    expect(defaults).toEqual({ a: 1 })
  })

  it('does not mutate props', () => {
    const props = { b: 2 }
    mergeProps({ a: 1 }, props)
    expect(props).toEqual({ b: 2 })
  })

  it('handles empty props', () => {
    expect(mergeProps({ a: 1 }, {})).toEqual({ a: 1 })
  })

  it('handles empty defaultProps', () => {
    expect(mergeProps({}, { a: 1 })).toEqual({ a: 1 })
  })
})
