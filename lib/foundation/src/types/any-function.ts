/**
 * The least-specific callable type: accepts any arguments, returns `unknown`.
 *
 * `never[]` for the parameters (not `unknown[]` or `any[]`) so a value typed as
 * `AnyFunction` is assignable *from* any concrete function signature without the
 * call site being able to actually invoke it with arbitrary arguments.
 */
export type AnyFunction = (...args: never[]) => unknown
