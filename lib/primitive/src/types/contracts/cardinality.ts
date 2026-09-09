import type { Simplify } from 'type-fest'

type MinMax = { min: number; max: number }

export type CardinalityInput = Partial<MinMax>

/** Unboundedness is encoded in the type, not a sentinel value, enabling exhaustive switches. */
export type Cardinality = Simplify<{ kind: 'bounded' } & MinMax> | { kind: 'unbounded' }
