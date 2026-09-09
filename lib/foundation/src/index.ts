// A genuinely flat barrel — every export below refers to a sibling FILE, never a directory. That
// property is the entire reason this package exists: it's imported directly (not through a
// bundler) by scripts run under `node --experimental-strip-types`, and Node's native ESM loader
// has no directory-to-index.ts fallback the way bundler-mode resolution does. Keep it this way —
// adding a subdirectory here reintroduces the exact problem this package was extracted to avoid.
// See DECISIONS.md.

export { iterate, items } from './iterate.ts'
export type { AnyRecord, StringMap } from './string-map.ts'
export type { AnyFunction } from './any-function.ts'
export { assertNever } from './assert-never.ts'
export { cn } from './cn.ts'
export { createObservable } from './create-observable.ts'
export type { Observable } from './create-observable.ts'
export { LRUCache } from './lru-cache.ts'
export { wrapMethodForDetection } from './wrap-method-for-detection.ts'
export type { WrappedMethod } from './wrap-method-for-detection.ts'
export {
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isArray,
  isObject,
  isPlainObject,
  isDefined,
  isUndefined,
  isNull,
  isNonNull,
  isNullish,
} from './type-guards.ts'
