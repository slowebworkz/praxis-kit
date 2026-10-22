// A genuinely flat barrel — every export below names an exact FILE (with its `.ts` extension),
// never a directory. That property is the entire reason this package exists: it's imported
// directly (not through a bundler) by scripts run under `node --experimental-strip-types`, and
// Node's native ESM loader has no directory-to-index.ts fallback the way bundler-mode resolution
// does. Files are grouped into folders for readability, but the folders hold NO `index.ts` of
// their own and the specifiers below never stop at a folder — keep it that way. Adding a
// directory-style re-export (`export * from './collections'`) reintroduces the exact problem this
// package was extracted to avoid. See DECISIONS.md.

// types
export type { AnyRecord, StringMap } from './types/string-map.ts'
export type { AnyFunction } from './types/any-function.ts'

// collections
export { iterate, items } from './collections/iterate.ts'
export { LRUCache } from './collections/lru-cache.ts'

// observation
export { createObservable } from './observation/create-observable.ts'
export type { Observable } from './observation/create-observable.ts'
export { wrapMethodForDetection } from './observation/wrap-method-for-detection.ts'
export type { WrappedMethod } from './observation/wrap-method-for-detection.ts'

// utils
export { assertNever } from './utils/assert-never.ts'
export { cn } from './utils/cn.ts'
export type { ClassValue } from './utils/cn.ts'
