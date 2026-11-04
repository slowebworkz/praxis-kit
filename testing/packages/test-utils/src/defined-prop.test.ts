import { describe, expect, it } from 'vitest'
import { definedProp } from './defined-prop'

describe('definedProp', () => {
  it('yields the property when the value is defined', () => {
    expect({ ...definedProp('as', 'section') }).toEqual({ as: 'section' })
  })

  it('yields nothing when the value is undefined, so the key is absent', () => {
    expect('as' in { ...definedProp('as', undefined) }).toBe(false)
  })

  it('keeps null and other falsy values — only undefined is dropped', () => {
    expect({ ...definedProp('a', null) }).toEqual({ a: null })
    expect({ ...definedProp('b', 0) }).toEqual({ b: 0 })
    expect({ ...definedProp('c', '') }).toEqual({ c: '' })
    expect({ ...definedProp('d', false) }).toEqual({ d: false })
  })
})
