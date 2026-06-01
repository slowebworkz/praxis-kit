import type { Simplify } from 'type-fest'
import type { layoutKeys } from '../layout-keys'

export type LayoutKey = (typeof layoutKeys)[number]

export type LayoutMode = LayoutKey | 'none'

// Exactly one key of K set to `true`, the rest forbidden (`never`) — the
// mutual-exclusion shape, derived from K so it tracks LayoutKey as the single
// source of truth. `Simplify` flattens each member's intersection for clean
// hover; it must stay INSIDE the mapped type — wrapping the outer union
// collapses the members and breaks the exclusivity.
type ExclusiveTrueProp<K extends PropertyKey> = {
  [P in K]: Simplify<Record<P, true> & Partial<Record<Exclude<K, P>, never>>>
}[K]

/**
 * Mutually exclusive layout shorthand props.
 *
 * At most one key may be `true`. Passing both is a compile-time error; the
 * runtime also warns and lets `flex` take precedence for graceful degradation.
 */
export type LayoutProps = ExclusiveTrueProp<LayoutKey> | Partial<Record<LayoutKey, never>>
