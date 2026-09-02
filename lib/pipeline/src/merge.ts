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

/** Keys written by more than one patch. For the future parallel executor: when
 *  several passes run against the same input context, overlapping writes make
 *  the merged result order-dependent, which breaks the parallel contract. An
 *  empty array means the patches are safe to merge in any order. */
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
