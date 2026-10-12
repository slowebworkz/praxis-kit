import { describe, it, expect } from 'vitest'
import { isObject, isPlainObject, isArray } from './index'

// Moved from @praxis-kit/foundation/src/type-guards.test.ts — guardz has no equivalent that
// preserves isObject's array-inclusive overload or isPlainObject's prototype-chain check, so these
// stay hand-rolled here rather than composed from guardz. See DECISIONS.md.

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
  })

  it('returns true for arrays by default', () => {
    expect(isObject([])).toBe(true)
  })

  it('returns true for class instances and null-prototype objects', () => {
    expect(isObject(new Date())).toBe(true)
    expect(isObject(Object.create(null))).toBe(true)
  })

  it('returns false for null', () => {
    expect(isObject(null)).toBe(false)
  })

  it('returns false for non-objects', () => {
    expect(isObject(undefined)).toBe(false)
    expect(isObject('string')).toBe(false)
    expect(isObject(42)).toBe(false)
    expect(isObject(true)).toBe(false)
    expect(isObject(() => {})).toBe(false)
  })

  it('excludes arrays when excludeArrays is true', () => {
    expect(isObject([], true)).toBe(false)
    expect(isObject({}, true)).toBe(true)
  })
})

describe('isPlainObject', () => {
  it('returns true for object literals', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
  })

  it('returns true for null-prototype objects', () => {
    expect(isPlainObject(Object.create(null))).toBe(true)
  })

  it('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false)
  })

  it('returns false for class instances', () => {
    class Foo {}
    expect(isPlainObject(new Foo())).toBe(false)
    expect(isPlainObject(new Date())).toBe(false)
    expect(isPlainObject(new Map())).toBe(false)
  })

  it('returns false for non-objects', () => {
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject('string')).toBe(false)
    expect(isPlainObject(() => {})).toBe(false)
  })
})

describe('isArray', () => {
  it('returns true for arrays', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2, 3])).toBe(true)
  })

  it('returns false for non-arrays', () => {
    expect(isArray({})).toBe(false)
    expect(isArray(null)).toBe(false)
    expect(isArray(undefined)).toBe(false)
    expect(isArray('string')).toBe(false)
  })
})
