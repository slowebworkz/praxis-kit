// The foundational runtime guards used across this package's children/ARIA/contract/variant
// domain guards. Most are sourced directly from `guardz` — see each export below for the mapping
// from this package's historical names (carried over from `@praxis-kit/primitive`'s own
// foundational barrel, which this package replaces) to `guardz`'s own. `isArray`/`isObject`/
// `isPlainObject` are the exception: `guardz` has no equivalent that preserves their exact
// behavior (a plain `Array.isArray`-style check, `isObject`'s array-inclusive overload, and
// `isPlainObject`'s prototype-chain check — `guardz`'s own `isNonNullObject` always excludes
// arrays and never checks the prototype), so they're carried over verbatim rather than composed.
// See `DECISIONS.md` for the full rationale.
import type { AnyRecord } from '@praxis-kit/primitive'
import { isDefined, isEqualTo } from 'guardz'

export { isString, isNumber, isFunction, isDefined } from 'guardz'

/** guardz's own name for "null or undefined" — re-exported under this package's historical name. */
export { isNil as isNullish } from 'guardz'

/**
 * guardz has no standalone `isNull`/`isUndefined` — `isEqualTo(null)`/`isEqualTo(undefined)` is
 * guardz's own documented composition for exactly this (see `isEqualTo`'s own doc example, which
 * literally shows `const isNull = isEqualTo(null)`).
 */
export const isNull = isEqualTo(null)
export const isUndefined = isEqualTo(undefined)

/**
 * guardz's `isDefined` already means "not null and not undefined" (its own docs: "the opposite
 * of isNil") — the same thing `isNonNull` meant historically. Aliased, not reimplemented.
 */
export const isNonNull = isDefined

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

/** Historical alias for `isPlainObject` — kept so existing callers of this name are unaffected. */
export const isRecord = isPlainObject
