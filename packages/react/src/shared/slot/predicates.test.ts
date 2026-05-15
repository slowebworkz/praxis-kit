import { describe, it, expect } from 'vitest'
import { isEventKey, isFunction, isPlainObject } from './predicates'

describe('isEventKey', () => {
  it('returns true for onClick', () => expect(isEventKey('onClick')).toBe(true))
  it('returns true for onChange', () => expect(isEventKey('onChange')).toBe(true))
  it('returns true for onPointerDown', () => expect(isEventKey('onPointerDown')).toBe(true))
  it('returns false for onclick (lowercase c)', () => expect(isEventKey('onclick')).toBe(false))
  it('returns false for className', () => expect(isEventKey('className')).toBe(false))
  it('returns false for on (no uppercase after)', () => expect(isEventKey('on')).toBe(false))
  it('returns false for onlySomeProp (no uppercase after on)', () =>
    expect(isEventKey('only')).toBe(false))
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
  it('returns true for an empty object', () => expect(isPlainObject({})).toBe(true))
  it('returns true for an object with properties', () => expect(isPlainObject({ a: 1 })).toBe(true))
  it('returns false for null', () => expect(isPlainObject(null)).toBe(false))
  it('returns false for an array', () => expect(isPlainObject([1, 2])).toBe(false))
  it('returns false for a string', () => expect(isPlainObject('str')).toBe(false))
  it('returns false for a number', () => expect(isPlainObject(42)).toBe(false))
})
