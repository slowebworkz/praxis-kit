// lib/diagnostics sits below @praxis-kit/guards in the dependency graph (guards depends on
// primitive, primitive depends on diagnostics for the Diagnostics type), so it can't use that
// package. It doesn't import `guardz` either, on purpose: the published build inlines this package
// into one shared chunk, and `guardz` does not tree-shake — importing any one guard from it pulled
// the whole library (~178 KB unminified) into every entry that reaches this chunk. Three one-line
// guards are cheaper than that. Every other file in the package imports them from here.

export const isUndefined = (value: unknown): value is undefined => value === undefined

/** Neither `null` nor `undefined`. */
export const isDefined = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null

export const isString = (value: unknown): value is string => typeof value === 'string'
