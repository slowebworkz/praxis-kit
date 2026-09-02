import type { PassResult } from './types'

/** Apply a pass's `context` patch to the accumulated pipeline context.
 *
 *  Shallow, top-level replace: every key present on `patch` replaces that key's
 *  value on `accumulated` wholesale; keys absent from `patch` are untouched.
 *  This is the honest match for `PassResult.context`'s `Partial<TContext>` shape
 *  — a shallow patch, merged shallowly — and it is order-independent as long as
 *  no two passes in the same parallel group write the same key (see
 *  `detectConflicts`). Sequential pipelines have a barrier between passes, so a
 *  later pass simply wins.
 *
 *  Deep/per-domain merge is deliberately not built yet; when a concrete
 *  in-context domain needs concat or recursive merge, a strategy map can be
 *  added with this behaviour as the default. `diagnostics` and `metadata` live
 *  outside `context` and accumulate on their own, so they are not this
 *  function's concern. */
export function mergeContext<TContext>(
  accumulated: TContext,
  patch: Partial<TContext> | undefined,
): TContext {
  if (patch === undefined) return accumulated
  return { ...accumulated, ...patch }
}

/** Fold a run of pass results into a context, in order. A convenience over
 *  repeated `mergeContext` for sequential execution. */
export function mergeResults<TContext>(
  initial: TContext,
  results: readonly Pick<PassResult<TContext>, 'context'>[],
): TContext {
  let context = initial
  for (const result of results) context = mergeContext(context, result.context)
  return context
}

/** The shallow patch that turns `before` into `after`: every key whose value
 *  changed by `!==` (identity). Used to recover a nested pipeline's
 *  contribution when it runs as one node of a parallel group — `mergeContext`
 *  preserves the reference of every untouched key, so an identity diff is exact
 *  for keys the pipeline left alone and conservative (reports a change) for a
 *  key reassigned to an equal-but-new value. */
export function shallowDiff<TContext>(
  before: TContext,
  after: TContext,
): Partial<TContext> {
  const patch: Partial<TContext> = {}
  const keys = Object.keys(after as Record<string, unknown>) as (keyof TContext)[]
  for (const key of keys) {
    if (after[key] !== before[key]) patch[key] = after[key]
  }
  return patch
}

/** Keys written by more than one patch. The parallel executor runs every node
 *  against the same input context, so overlapping writes would make the merged
 *  result order-dependent — it treats a non-empty result as a fatal pipeline
 *  authoring error. An empty array means the patches are safe to merge in any
 *  order. */
export function detectConflicts<TContext>(
  patches: readonly (Partial<TContext> | undefined)[],
): (keyof TContext)[] {
  const seen = new Set<keyof TContext>()
  const conflicts = new Set<keyof TContext>()
  for (const patch of patches) {
    if (patch === undefined) continue
    for (const key of Object.keys(patch) as (keyof TContext)[]) {
      if (seen.has(key)) conflicts.add(key)
      else seen.add(key)
    }
  }
  return [...conflicts]
}
