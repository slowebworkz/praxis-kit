import type { MergeStrategy } from './types/merge-strategy'

/**
 * A `MergeStrategy` that shallowly spreads `incoming` over `previous`. Covers
 * the common case where a pipeline's context is a flat object and passes only
 * ever add or overwrite top-level keys.
 */
export const shallowObjectMerge: MergeStrategy<object> = {
  merge: (previous, incoming) => ({ ...previous, ...incoming }),
}
