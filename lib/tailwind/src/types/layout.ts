import type { Simplify, ValueOf } from 'type-fest'
import type { StringMap } from '@praxis-kit/primitive'
import type { layoutKeys } from '../layout-keys'

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

// The resolved layout selected by either the explicit prop or shorthand props.
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
 * At most one boolean shorthand prop may be `true`. The optional single-valued
 * `layout` prop can be used instead, or alongside a shorthand; when present, it
 * takes precedence. Multiple shorthand `true` props produce a compile-time error.
 * If invalid shorthand combinations reach runtime without `layout`, the resolver
 * warns and uses the first declared layout.
 */
export type LayoutProps<T extends readonly string[]> = (
  ExclusiveTrueProp<LayoutKey<T>> | Partial<Record<LayoutKey<T>, never>>
) & {
  /**
   * Explicit layout selection; when supplied, it overrides boolean shorthand props.
   * `'none'` means no display class is injected; use `'hidden'` for `display: none`.
   */
  layout?: ResolvedLayout<T>
}

/**
 * `LayoutProps` flattened for the type-extraction path (`ContractProps<T>`): boolean shorthand
 * keys are optional `true`s with no mutual exclusivity, alongside the typed single-valued `layout`
 * prop. The component's own call signature keeps the strict `LayoutProps` union; this is the shape
 * a wrapper author wants for `Omit` / `Pick` / rest-destructure, which the ~22-member union breaks.
 * Declared as the `ClassPlugin` flat-props generic so adapters never need to know the layout keys.
 */
export type FlatLayoutProps = { [K in LayoutKey<typeof layoutKeys>]?: true } & {
  layout?: ResolvedLayout<typeof layoutKeys>
}
