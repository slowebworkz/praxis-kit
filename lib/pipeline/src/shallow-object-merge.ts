/**
 * A `MergeStrategy` that shallowly spreads `incoming` over `previous`. Covers
 * the common case where a pipeline's context is a flat object and passes only
 * ever add or overwrite top-level keys. `merge` is generic so this single
 * value structurally satisfies `MergeStrategy<TContext>` for any object
 * `TContext` — a fixed type parameter (e.g. `MergeStrategy<object>`) would
 * only be assignable where `TContext` is exactly `object`, since the
 * strategy's return type is checked covariantly against the pipeline's
 * context type.
 */
export const shallowObjectMerge = {
  merge: <TContext extends object>(previous: TContext, incoming: Partial<TContext>): TContext => ({
    ...previous,
    ...incoming,
  }),
}
