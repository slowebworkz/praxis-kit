import { describe, expect, it } from 'vitest'

import { getTypeName } from './get-type-name'

// ---------------------------------------------------------------------------
// Null / undefined
// ---------------------------------------------------------------------------

describe('getTypeName — null and undefined', () => {
  it('returns "null" for null', () => {
    expect(getTypeName(null)).toBe('null')
  })

  it('returns "undefined" for undefined', () => {
    expect(getTypeName(undefined)).toBe('undefined')
  })
})

// ---------------------------------------------------------------------------
// Class instances — constructor.name used
// ---------------------------------------------------------------------------

describe('getTypeName — class instances', () => {
  it('returns the class name for a named class instance', () => {
    class Foo {}
    expect(getTypeName(new Foo())).toBe('Foo')
  })

  it('returns the class name for a differently named class', () => {
    class MyComponent {}
    expect(getTypeName(new MyComponent())).toBe('MyComponent')
  })

  it('returns "Array" for an array (Array constructor)', () => {
    expect(getTypeName([])).toBe('Array')
  })

  it('returns "Date" for a Date instance', () => {
    expect(getTypeName(new Date())).toBe('Date')
  })

  it('returns "Map" for a Map instance', () => {
    expect(getTypeName(new Map())).toBe('Map')
  })

  it('returns "Set" for a Set instance', () => {
    expect(getTypeName(new Set())).toBe('Set')
  })
})

// ---------------------------------------------------------------------------
// Plain objects — Object constructor excluded
// ---------------------------------------------------------------------------

describe('getTypeName — plain objects', () => {
  it('returns "object" for a plain object literal', () => {
    expect(getTypeName({})).toBe('object')
  })

  it('returns "object" for Object.create(null)', () => {
    expect(getTypeName(Object.create(null))).toBe('object')
  })
})

// ---------------------------------------------------------------------------
// Primitives — typeof fallback
// ---------------------------------------------------------------------------

describe('getTypeName — primitives', () => {
  it('returns "number" for a number', () => {
    expect(getTypeName(42)).toBe('number')
    expect(getTypeName(0)).toBe('number')
    expect(getTypeName(NaN)).toBe('number')
  })

  it('returns "string" for a string', () => {
    expect(getTypeName('hello')).toBe('string')
    expect(getTypeName('')).toBe('string')
  })

  it('returns "boolean" for a boolean', () => {
    expect(getTypeName(true)).toBe('boolean')
    expect(getTypeName(false)).toBe('boolean')
  })

  it('returns "function" for a function', () => {
    expect(getTypeName(() => null)).toBe('function')
    expect(getTypeName(function named() {})).toBe('function')
  })

  it('returns "symbol" for a symbol', () => {
    expect(getTypeName(Symbol('x'))).toBe('symbol')
  })
})
