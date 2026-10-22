import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  isObject,
  isPlainObject,
  isArray,
  isEqualTo,
  isFalse,
  isTrue,
  isNull,
  isUndefined,
} from './index'

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

describe('isFalse', () => {
  it('is true only for the boolean false', () => {
    expect(isFalse(false)).toBe(true)
  })

  it('is false for other falsy values, so it cannot swallow 0, "", null or undefined', () => {
    for (const value of [true, 0, '', null, undefined, NaN, 'false']) {
      expect(isFalse(value)).toBe(false)
    }
  })

  it('narrows to the literal false, not boolean', () => {
    const value: unknown = false
    if (isFalse(value)) {
      expectTypeOf(value).toEqualTypeOf<false>()
    }
  })
})

describe('isTrue', () => {
  it('is true only for the boolean true', () => {
    expect(isTrue(true)).toBe(true)
  })

  it('is false for other truthy values, so it cannot swallow 1, strings or objects', () => {
    for (const value of [false, 1, 'true', '', {}, [], null, undefined]) {
      expect(isTrue(value)).toBe(false)
    }
  })

  it('is not the complement of isFalse', () => {
    // Why `!isFalse(x)` cannot stand in for `isTrue(x)`: it is true for every non-false value.
    expect(!isFalse('Close')).toBe(true)
    expect(isTrue('Close')).toBe(false)
  })

  it('narrows to the literal true, not boolean', () => {
    const value: unknown = true
    if (isTrue(value)) {
      expectTypeOf(value).toEqualTypeOf<true>()
    }
  })
})

describe('isNull / isUndefined', () => {
  it('match only their own value', () => {
    expect(isNull(null)).toBe(true)
    expect(isNull(undefined)).toBe(false)
    expect(isUndefined(undefined)).toBe(true)
    expect(isUndefined(null)).toBe(false)
  })
})

describe('isEqualTo', () => {
  it('builds an exact-value guard', () => {
    const isAdmin = isEqualTo('admin')
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin('Admin')).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })

  it('uses strict equality, so it does not coerce', () => {
    const isOne = isEqualTo(1)
    expect(isOne(1)).toBe(true)
    expect(isOne('1')).toBe(false)
    expect(isOne(true)).toBe(false)
  })

  it('narrows to a literal when given an explicit type argument', () => {
    const isOn = isEqualTo<'on'>('on')
    const value: unknown = 'on'
    if (isOn(value)) {
      expectTypeOf(value).toEqualTypeOf<'on'>()
    }
  })
})
