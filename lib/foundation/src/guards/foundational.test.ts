import { describe, expect, it } from 'vitest'
import * as guardz from 'guardz'
import * as api from './foundational.ts'
import {
  isArray,
  isDefined,
  isEqualTo,
  isFalse,
  isFunction,
  isNil,
  isNonNull,
  isNonNullObject,
  isNull,
  isNullish,
  isNumber,
  isObject,
  isPlainObject,
  isRecord,
  isString,
  isTrue,
  isUndefined,
} from './foundational.ts'

// These guards replaced re-exports from `guardz` (a CommonJS barrel that bundlers cannot
// tree-shake). Each one is checked against `guardz` itself over the same values, so a divergence in
// behaviour fails here rather than in a consumer.
class Thing {}
class Sub extends Array<number> {}
const withProto = Object.create({ inherited: true })
const VALUES: readonly unknown[] = [
  undefined,
  null,
  0,
  -0,
  1,
  -1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  '',
  'a',
  '0',
  true,
  false,
  {},
  { a: 1 },
  [],
  [1, 2],
  Object.create(null),
  new Date(),
  new Thing(),
  new Map(),
  /re/,
  () => {},
  function named() {},
  class Klass {},
  Symbol('s'),
  10n,
  withProto,
  new Sub(),
  new Uint8Array(2),
  new String('boxed'),
  new Number(1),
  new Proxy({}, {}),
  Object.freeze({ frozen: true }),
  Object.assign(() => {}, { extra: 1 }),
  (function () {
    // eslint-disable-next-line prefer-rest-params
    return arguments
  })(),
]

const label = (value: unknown): string =>
  typeof value === 'symbol' || typeof value === 'bigint'
    ? String(value)
    : (JSON.stringify(value) ?? String(value))

describe('parity with guardz', () => {
  const pairs = {
    isString: [isString, guardz.isString],
    isNumber: [isNumber, guardz.isNumber],
    isFunction: [isFunction, guardz.isFunction],
    isNil: [isNil, guardz.isNil],
    isDefined: [isDefined, guardz.isDefined],
    isNonNullObject: [isNonNullObject, guardz.isNonNullObject],
  } as const

  for (const [name, [ours, theirs]] of Object.entries(pairs)) {
    it(`${name} agrees with guardz for every value`, () => {
      for (const value of VALUES) {
        expect([name, label(value), ours(value)]).toEqual([name, label(value), theirs(value)])
      }
    })
  }

  it('isEqualTo agrees with guardz for every expected value and candidate', () => {
    for (const expected of VALUES) {
      const ours = isEqualTo(expected)
      const theirs = guardz.isEqualTo(expected)
      for (const value of VALUES) {
        expect([label(expected), label(value), ours(value)]).toEqual([
          label(expected),
          label(value),
          theirs(value),
        ])
      }
    }
  })
})

describe('named aliases', () => {
  it('isNullish is isNil and isNonNull is isDefined', () => {
    expect(isNullish).toBe(isNil)
    expect(isNonNull).toBe(isDefined)
    expect(isRecord).toBe(isPlainObject)
  })

  it('isNull, isUndefined, isTrue and isFalse match only their own value', () => {
    expect(VALUES.filter(isNull)).toEqual([null])
    expect(VALUES.filter(isUndefined)).toEqual([undefined])
    expect(VALUES.filter(isTrue)).toEqual([true])
    expect(VALUES.filter(isFalse)).toEqual([false])
  })
})

describe('isNumber', () => {
  it('rejects NaN but accepts Infinity and -0', () => {
    expect(isNumber(Number.NaN)).toBe(false)
    expect(isNumber(Number.POSITIVE_INFINITY)).toBe(true)
    expect(isNumber(-0)).toBe(true)
  })
})

describe('single-argument guards', () => {
  // The difference from guardz that matters: its guards take an optional `config` second argument,
  // so `.every(guardzIsString)` passes the array index as `config` and throws on the first miss.
  it('can be passed straight to every/filter/some', () => {
    expect(['a', 'b'].every(isString)).toBe(true)
    expect(['a', 1, 'b'].every(isString)).toBe(false)
    expect(['a', 1, 'b'].filter(isString)).toEqual(['a', 'b'])
    expect([1, 'a'].some(isString)).toBe(true)
    expect([null, 0, undefined, 'x'].filter(isDefined)).toEqual([0, 'x'])
  })
})

describe('object guards', () => {
  it('isObject keeps its array-inclusive overload', () => {
    expect(isObject([])).toBe(true)
    expect(isObject([], true)).toBe(false)
    expect(isObject(null)).toBe(false)
  })

  it('isPlainObject checks the prototype chain', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
    expect(isPlainObject(new Thing())).toBe(false)
    expect(isPlainObject([])).toBe(false)
  })

  it('isArray is Array.isArray', () => {
    expect(isArray([])).toBe(true)
    expect(isArray({ length: 0 })).toBe(false)
  })
})

// ─── Frozen references ────────────────────────────────────────────────────────
// `isArray`, `isObject`, `isPlainObject` and `isRecord` were never `guardz` re-exports: they were
// hand-written in `@praxis-kit/guards`. These are verbatim copies of that code from before the
// guards moved here, so the parity checks below compare against the old public behaviour rather
// than against `guardz`, which has no equivalent. Do not "improve" them.
const reference = {
  isArray: (value: unknown): boolean => Array.isArray(value),
  isObject: (value: unknown, excludeArrays = false): boolean => {
    if (value === null || typeof value !== 'object') return false
    return excludeArrays ? !Array.isArray(value) : true
  },
  isPlainObject: (value: unknown): boolean => {
    if (!reference.isObject(value, true)) return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
  },
}

describe('parity with the previous hand-written guards', () => {
  it('isArray agrees for every value', () => {
    for (const value of VALUES) {
      expect([label(value), isArray(value)]).toEqual([label(value), reference.isArray(value)])
    }
  })

  it('isObject agrees for every value and every excludeArrays form', () => {
    for (const value of VALUES) {
      expect([label(value), isObject(value)]).toEqual([label(value), reference.isObject(value)])
      expect([label(value), isObject(value, false)]).toEqual([
        label(value),
        reference.isObject(value, false),
      ])
      expect([label(value), isObject(value, true)]).toEqual([
        label(value),
        reference.isObject(value, true),
      ])
    }
  })

  it('isPlainObject agrees for every value', () => {
    for (const value of VALUES) {
      expect([label(value), isPlainObject(value)]).toEqual([
        label(value),
        reference.isPlainObject(value),
      ])
    }
  })

  it('isRecord agrees with the old isPlainObject for every value', () => {
    for (const value of VALUES) {
      expect([label(value), isRecord(value)]).toEqual([
        label(value),
        reference.isPlainObject(value),
      ])
    }
  })
})

describe('parity of the guardz-composed exports', () => {
  const composed = {
    isNull: [isNull, guardz.isEqualTo(null)],
    isUndefined: [isUndefined, guardz.isEqualTo(undefined)],
    isTrue: [isTrue, guardz.isEqualTo<true>(true)],
    isFalse: [isFalse, guardz.isEqualTo<false>(false)],
    isNullish: [isNullish, guardz.isNil],
    isNonNull: [isNonNull, guardz.isDefined],
  } as const

  for (const [name, [ours, theirs]] of Object.entries(composed)) {
    it(`${name} agrees with its guardz original for every value`, () => {
      for (const value of VALUES) {
        expect([name, label(value), ours(value)]).toEqual([name, label(value), theirs(value)])
      }
    })
  }
})

// ─── The suite polices itself ─────────────────────────────────────────────────
// Every exported guard must be named in a parity block above. Adding an export without adding a
// parity check fails here, so the suite cannot quietly stop being exhaustive.
describe('coverage', () => {
  const PARITY_TESTED = [
    // against guardz
    'isString',
    'isNumber',
    'isFunction',
    'isNil',
    'isDefined',
    'isNonNullObject',
    'isEqualTo',
    'isNull',
    'isUndefined',
    'isTrue',
    'isFalse',
    'isNullish',
    'isNonNull',
    // against the previous hand-written versions
    'isArray',
    'isObject',
    'isPlainObject',
    'isRecord',
  ]

  it('every exported guard has a parity check, and no check names a missing export', () => {
    expect(Object.keys(api).sort()).toEqual([...PARITY_TESTED].sort())
  })
})
