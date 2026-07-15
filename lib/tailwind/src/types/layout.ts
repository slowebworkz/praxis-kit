import type { Simplify, ValueOf } from 'type-fest'
import type { StringMap } from '@praxis-kit/primitive'

// Produces the union of values from a tuple.
// Unlike `ValueOf`, tuples must use `T[number]` because `keyof` also includes
// array properties such as `length` and methods.
type TupleValues<T extends readonly unknown[]> = T[number]

// Union of valid layout identifiers derived from the canonical `layoutKeys`
// tuple. Consumers pass `typeof layoutKeys` to keep this module decoupled from
// the runtime definition.
export type LayoutKey<T extends readonly string[]> = TupleValues<T>

// Union of layout families derived from the values of `LAYOUT_FAMILY_MAP`.
// This is intentionally based on the map's values rather than its keys.
export type LayoutFamily<M extends StringMap<string>> = ValueOf<M>

// The resolved layout after shorthand props have been evaluated.
export type ResolvedLayout<T extends readonly string[]> = LayoutKey<T> | 'none'

// Produces a mutually exclusive object where exactly one property is `true`
// and all other properties are forbidden (`never`).
//
// `Simplify` is applied to each union member individually to improve editor
// hovers. Applying it to the outer union would collapse the exclusivity.
type ExclusiveTrueProp<K extends PropertyKey> = {
  [P in K]: Simplify<Record<P, true> & Partial<Record<Exclude<K, P>, never>>>
}[K]

/**
 * Mutually exclusive layout shorthand props.
 *
 * Exactly one layout prop may be `true`, or none at all. Multiple `true`
 * props produce a compile-time error. If invalid props reach runtime, the
 * resolver warns and uses the first declared layout.
 */
export type LayoutProps<T extends readonly string[]> =
  ExclusiveTrueProp<LayoutKey<T>> | Partial<Record<LayoutKey<T>, never>>
