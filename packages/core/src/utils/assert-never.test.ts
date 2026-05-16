import { describe, it, expect } from 'vitest'
import { assertNever } from './assert-never'

describe('assertNever', () => {
  it('throws when called with any value', () => {
    expect(() => assertNever('unexpected' as never)).toThrow('Unexpected value: unexpected')
  })

  it('includes the value in the error message', () => {
    expect(() => assertNever(42 as never)).toThrow('Unexpected value: 42')
  })
})
