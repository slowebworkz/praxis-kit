import type { OmitIndexSignature } from 'type-fest'

/**
 * Strip index signatures from each union member independently.
 *
 * `OmitIndexSignature<T>` applied directly to a union can observe only keys common to every
 * member. Contract props and variants may be mutually-exclusive unions (for example, generated
 * layout props), so distribute before removing index signatures to preserve member-specific keys.
 */
export type DistributiveOmitIndexSignature<T> = T extends object ? OmitIndexSignature<T> : T
