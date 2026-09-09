import { describe, it, expect } from 'vitest'
import { invariant, invariantDefined } from './invariant'

describe('invariant', () => {
  it('throws with the provided message when condition is false', () => {
    expect(() => invariant(false, 'must be true')).toThrow('must be true')
  })

  it('throws when condition is null', () => {
    expect(() => invariant(null, 'must be true')).toThrow('must be true')
  })

  it('throws when condition is undefined', () => {
    expect(() => invariant(undefined, 'must be true')).toThrow('must be true')
  })

  it('does not throw when condition is true', () => {
    expect(() => invariant(true, 'must be true')).not.toThrow()
  })

  it('does not throw when condition is a truthy value', () => {
    expect(() => invariant(1, 'msg')).not.toThrow()
    expect(() => invariant('non-empty', 'msg')).not.toThrow()
    expect(() => invariant({}, 'msg')).not.toThrow()
  })
})

describe('invariantDefined', () => {
  it('throws with the provided message when value is null', () => {
    expect(() => invariantDefined(null, 'must be defined')).toThrow('must be defined')
  })

  it('throws when value is undefined', () => {
    expect(() => invariantDefined(undefined, 'must be defined')).toThrow('must be defined')
  })

  it('does not throw when value is 0', () => {
    expect(() => invariantDefined(0, 'msg')).not.toThrow()
  })

  it('does not throw when value is an empty string', () => {
    expect(() => invariantDefined('', 'msg')).not.toThrow()
  })

  it('does not throw when value is false', () => {
    expect(() => invariantDefined(false, 'msg')).not.toThrow()
  })
})
