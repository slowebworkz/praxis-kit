import { describe, it, expect } from 'vitest'
import { isReactEventKey, isFunction, isPlainObject } from './predicates'

describe('isReactEventKey', () => {
  it('returns true for onClick', () => expect(isReactEventKey('onClick')).toBe(true))
  it('returns true for onChange', () => expect(isReactEventKey('onChange')).toBe(true))
  it('returns true for onPointerDown', () => expect(isReactEventKey('onPointerDown')).toBe(true))
  it('returns false for onclick (lowercase c)', () =>
    expect(isReactEventKey('onclick')).toBe(false))
  it('returns false for className', () => expect(isReactEventKey('className')).toBe(false))
  it('returns false for on (no uppercase after)', () => expect(isReactEventKey('on')).toBe(false))
  it('returns false for onlySomeProp (no uppercase after on)', () =>
    expect(isReactEventKey('only')).toBe(false))
  it('returns false for on_Click (underscore, not uppercase)', () =>
    expect(isReactEventKey('on_Click')).toBe(false))
  it('returns false for on-Click (hyphen, not uppercase)', () =>
    expect(isReactEventKey('on-Click')).toBe(false))
})

describe('isFunction', () => {
  it('returns true for a function', () => expect(isFunction(() => {})).toBe(true))
  it('returns true for an async function', () => expect(isFunction(async () => {})).toBe(true))
  it('returns false for null', () => expect(isFunction(null)).toBe(false))
  it('returns false for undefined', () => expect(isFunction(undefined)).toBe(false))
  it('returns false for a string', () => expect(isFunction('fn')).toBe(false))
  it('returns false for an object', () => expect(isFunction({})).toBe(false))
})

describe('isPlainObject', () => {
  it('returns true for an empty object literal', () => expect(isPlainObject({})).toBe(true))
  it('returns true for an object with properties', () => expect(isPlainObject({ a: 1 })).toBe(true))
  it('returns true for Object.create(null)', () =>
    expect(isPlainObject(Object.create(null))).toBe(true))
  it('returns false for null', () => expect(isPlainObject(null)).toBe(false))
  it('returns false for an array', () => expect(isPlainObject([1, 2])).toBe(false))
  it('returns false for a string', () => expect(isPlainObject('str')).toBe(false))
  it('returns false for a number', () => expect(isPlainObject(42)).toBe(false))
  it('returns false for a Date', () => expect(isPlainObject(new Date())).toBe(false))
  it('returns false for a Map', () => expect(isPlainObject(new Map())).toBe(false))
  it('returns false for a Set', () => expect(isPlainObject(new Set())).toBe(false))
  it('returns false for a RegExp', () => expect(isPlainObject(/re/)).toBe(false))
  it('returns false for a class instance', () =>
    expect(isPlainObject(new (class Foo {})())).toBe(false))
  it('returns false for an object with a custom non-null prototype', () =>
    expect(isPlainObject(Object.create({ x: 1 }))).toBe(false))
})
