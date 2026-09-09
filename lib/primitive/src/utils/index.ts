// assertNever, cn, createObservable, iterate/items, LRUCache, and wrapMethodForDetection moved to
// @praxis-kit/foundation (a genuinely flat package, safe to import directly under Node's native
// ESM loader, not just through a bundler) — re-exported here so every existing consumer of
// @praxis-kit/primitive's public surface keeps working unchanged. See DECISIONS.md.
export {
  assertNever,
  cn,
  createObservable,
  iterate,
  items,
  LRUCache,
  wrapMethodForDetection,
} from '@praxis-kit/foundation'
export type { Observable, WrappedMethod } from '@praxis-kit/foundation'

export { lazy } from './lazy'
export { memoize } from './memoize'
export { mergeRefsCore } from './merge-refs'
export { mergeProps } from './merge-props'
