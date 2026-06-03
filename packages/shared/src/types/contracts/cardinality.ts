export type CardinalityInput = { min?: number; max?: number }

/** Unboundedness is encoded in the type, not a sentinel value, enabling exhaustive switches. */
export type Cardinality = { kind: 'bounded'; min: number; max: number } | { kind: 'unbounded' }
