import { describe, it, expect } from 'vitest'
import { isObject, isString, isNumber, isFunction, isPlainObject } from './type-guards'

// ── isObject ────────────────────────────────────────────────────────────────

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

// ── isString ──────────────────────────────────────────────────────────────────

describe('isString', () => {
  it('returns true for strings', () => {
    expect(isString('')).toBe(true)
    expect(isString('hello')).toBe(true)
  })

  it('returns false for non-strings', () => {
    expect(isString(42)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(undefined)).toBe(false)
    expect(isString({})).toBe(false)
    expect(isString(String('boxed'))).toBe(true)
  })
})

// ── isNumber ──────────────────────────────────────────────────────────────────

describe('isNumber', () => {
  it('returns true for numbers', () => {
    expect(isNumber(0)).toBe(true)
    expect(isNumber(42)).toBe(true)
    expect(isNumber(NaN)).toBe(true)
    expect(isNumber(Infinity)).toBe(true)
  })

  it('returns false for non-numbers', () => {
    expect(isNumber('42')).toBe(false)
    expect(isNumber(null)).toBe(false)
    expect(isNumber(undefined)).toBe(false)
  })
})

// ── isFunction ────────────────────────────────────────────────────────────────

describe('isFunction', () => {
  it('returns true for functions', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(function named() {})).toBe(true)
    expect(isFunction(class {})).toBe(true)
    expect(isFunction(Array.isArray)).toBe(true)
  })

  it('returns false for non-functions', () => {
    expect(isFunction({})).toBe(false)
    expect(isFunction(null)).toBe(false)
    expect(isFunction(undefined)).toBe(false)
    expect(isFunction('function')).toBe(false)
  })
})

// ── isPlainObject ─────────────────────────────────────────────────────────────

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
