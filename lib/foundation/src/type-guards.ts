import type { AnyFunction } from './any-function.ts'
import type { AnyRecord } from './string-map.ts'

// Runtime type guards — the small, dependency-free predicate vocabulary shared across the
// workspace. They live here (not in `@praxis-kit/primitive`) so packages below `primitive` in the
// dependency graph — `@praxis-kit/diagnostics` — and scripts run under `node
// --experimental-strip-types` can use the same predicates instead of hand-rolling `typeof` checks.
// `@praxis-kit/primitive` re-exports every function below from its own public surface, so its
// existing consumers are unaffected. Domain guards (`isTag`, `isAriaRole`, `isVariantMap`, …) stay
// in `primitive` — they depend on domain types.
//
// NOTE: `isUndefined` / `isNull` take a value you already hold. For "does this global binding
// exist at all" (SSR guards), use `typeof X !== 'undefined'` — passing a possibly-undeclared
// identifier to a function throws `ReferenceError` before the guard runs.

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === 'function'
}

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

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined
}

export function isNull(value: unknown): value is null {
  return value === null
}

export function isNonNull<T>(value: T): value is NonNullable<T> {
  return value != null
}

export function isNullish(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value)
}
