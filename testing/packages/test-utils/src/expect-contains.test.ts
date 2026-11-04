import { describe, expect, it } from 'vitest'
import { expectContains } from './expect-contains'

describe('expectContains', () => {
  it('matches substrings of a string', () => {
    expectContains('<nav class="a b">', { has: ['<nav', 'class="a'], lacks: ['<div'] })
  })

  it('matches whole elements of an array, not substrings', () => {
    const tokens = ['flex-col', 'rounded']
    expectContains(tokens, { has: ['flex-col'], lacks: ['flex'] })
    expect(() => expectContains(tokens, { has: ['flex'] })).toThrow()
  })

  it('fails when a `has` token is missing', () => {
    expect(() => expectContains('abc', { has: ['x'] })).toThrow()
  })

  it('fails when a `lacks` token is present', () => {
    expect(() => expectContains('abc', { lacks: ['b'] })).toThrow()
    expect(() => expectContains(['a', 'b'], { lacks: ['b'] })).toThrow()
  })

  it('accepts an empty spec', () => {
    expectContains('anything', {})
  })
})
