/** A zero-argument function that produces a `T` — deferred/lazy construction, singletons. */
export type Factory<T> = () => T

/** A single-argument pure function — the shape `memoize()` wraps. */
export type UnaryFn<T, R> = (arg: T) => R
