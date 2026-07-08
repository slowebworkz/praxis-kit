import type { Simplify } from 'type-fest'
import type { StringMap } from '@praxis-kit/primitive'

// Element type of a tuple, e.g. ['flex', 'grid'] -> 'flex' | 'grid'.
type TupleValues<T extends readonly unknown[]> = T[number]

// Value type of an object/record, e.g. { a: 'x', b: 'y' } -> 'x' | 'y'.
// Distinct from TupleValues: `keyof` on a tuple also includes numeric
// indices, "length", and array methods, so T[keyof T] on a tuple is far
// wider than T[number] and must not be used for tuples.
type ValueOf<T> = T[keyof T]

// Generic over the concrete `layoutKeys` tuple so this stays derivable from
// the single source of truth (layout-keys.ts) without this types module
// importing it directly. Callers pass `typeof layoutKeys` as T.
export type LayoutKey<T extends readonly string[]> = TupleValues<T>

// Generic over the concrete LAYOUT_FAMILY_MAP object (constants.ts), not over
// the LayoutKey tuple — family values ('flex' | 'grid' | 'none') come from
// the map's values, not from its keys.
export type LayoutFamily<M extends StringMap<string>> = ValueOf<M>

export type LayoutMode<T extends readonly string[]> = LayoutKey<T> | 'none'

// Exactly one key of K set to `true`, the rest forbidden (`never`) — the
// mutual-exclusion shape, derived from K so it tracks LayoutKey as the single
// source of truth. `Simplify` flattens each member's intersection for clean
// hover; it must stay INSIDE the mapped type — wrapping the outer union
// collapses the members and breaks the exclusivity.
type ExclusiveTrueProp<K extends PropertyKey> = {
  [P in K]: Simplify<Record<P, true> & Partial<Record<Exclude<K, P>, never>>>
}[K]

/**
 * Mutually exclusive display shorthand props.
 *
 * At most one key may be `true`. Passing multiple is a compile-time error; the
 * runtime also warns and lets the first key in declaration order take precedence.
 */
export type LayoutProps<T extends readonly string[]> =
  ExclusiveTrueProp<LayoutKey<T>> | Partial<Record<LayoutKey<T>, never>>
