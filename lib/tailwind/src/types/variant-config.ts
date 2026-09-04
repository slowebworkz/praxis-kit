import type { AnyRecord, StringMap } from '@praxis-kit/primitive'

// Internal helper types used by the dead-variant analysis. These intentionally
// model only the information required by the analysis rather than mirroring the
// full @praxis-kit/core variant types.

// The resolved variant value selected for each variant dimension.
export type VariantSelection = StringMap<string>

// A minimally typed compound variant.
//
// Only the presence of dimension keys is relevant to the analysis. The
// associated class value and condition types are intentionally `unknown` to
// avoid coupling to @praxis-kit/core's generic CompoundVariant type.
export type CompoundVariant = { class?: unknown } & AnyRecord
