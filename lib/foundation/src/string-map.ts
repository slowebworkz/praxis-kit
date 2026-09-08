/**
 * A string-keyed object whose values are of type `T`.
 */
export type StringMap<T = unknown> = Record<string, T>

/**
 * A string-keyed object with values of unknown type.
 */
export type AnyRecord = StringMap<unknown>
