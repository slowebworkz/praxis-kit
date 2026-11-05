// The foundational runtime guards, written out rather than re-exported from `guardz`.
//
// `guardz` is a CommonJS package with a single barrel file and no `sideEffects: false`, so no
// bundler can tree-shake it: importing one guard keeps all of it (about 40 KB minified, 9 KB gzipped
// for a single function). The published build inlined it, whole, into every entry. The handful of
// guards this workspace actually uses are one-line predicates, so they live here, where every package
// (including `@praxis-kit/diagnostics`, which sits below `@praxis-kit/guards`) can take them from a
// dependency-free leaf and a bundler keeps only the ones that are called.
//
// Behaviour matches `guardz` exactly (see `foundational.test.ts`, which checks each guard against it
// over a matrix of values), with one deliberate difference: these take a single argument. `guardz`
// guards accept an optional second `config` parameter, so passing one straight to `.every()` /
// `.filter()` hands it the array index as `config` and throws on a non-match.

import type { AnyRecord } from '../types/string-map.ts'

export const isString = (value: unknown): value is string => typeof value === 'string'

/** A number, excluding `NaN` (as `guardz`'s `isNumber` does). */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value)

export const isFunction = (value: unknown): value is (...args: never[]) => unknown =>
  typeof value === 'function'

/** `null` or `undefined`. */
export const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined

/** `isNil` under this workspace's historical name. */
export const isNullish = isNil

/** Neither `null` nor `undefined`. */
export const isDefined = <T>(value: T): value is NonNullable<T> =>
  value !== null && value !== undefined

/** `isDefined` under this workspace's historical name. */
export const isNonNull = isDefined

/**
 * Builds a guard for one exact value (strict `===`). Pass the type argument for literals that would
 * otherwise widen: `isEqualTo<true>(true)`, since a bare `isEqualTo(true)` infers `boolean`.
 */
export const isEqualTo =
  <T>(expected: T) =>
  (value: unknown): value is T =>
    value === expected

export const isNull = isEqualTo(null)
export const isUndefined = isEqualTo(undefined)
export const isFalse = isEqualTo<false>(false)
export const isTrue = isEqualTo<true>(true)

/** A non-null object that is not an array (as `guardz`'s `isNonNullObject` does). */
export const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value)
}

export function isObject(value: unknown, excludeArrays: true): value is AnyRecord
export function isObject(value: unknown, excludeArrays?: false): value is object
export function isObject(value: unknown, excludeArrays = false): boolean {
  if (value === null || typeof value !== 'object') return false
  return excludeArrays ? !Array.isArray(value) : true
}

export function isPlainObject(value: unknown): value is AnyRecord {
  if (!isObject(value, true)) return false
  const proto = Object.getPrototypeOf(value)
  // null-prototype objects (Object.create(null)) are also plain objects.
  return proto === Object.prototype || proto === null
}

/** Historical alias for `isPlainObject`. */
export const isRecord = isPlainObject
