/**
 * Type-level mirror of the runtime slot-merge policy (`classifyProp`,
 * `lib/adapter-utils/src/slot/merge-slot-props.ts`) that `compose: { with, allProps: true }`
 * transitively reaches through `asChild`/`Slot` (see `docs/design/compose-props-typing.md`,
 * section 5, for the confirmed call path). Four categories, matching
 * `PROP_MERGE_POLICIES` (`lib/adapter-utils/src/slot/policies.ts`) exactly — kept in sync by hand,
 * not by a shared import, since one side is a runtime value tuple and the other a type; a change
 * to `classifyProp`'s classification must be mirrored here.
 */
export type PropMergeCategory = 'chain' | 'concat' | 'shallow-merge' | 'child-wins'

/**
 * Approximates `classifyProp`'s `EVENT_HANDLER_RE.test(key) && isFunction(slotVal) &&
 * isFunction(childVal)` check with a key-name pattern alone (`` on${string} ``) — types can't
 * additionally confirm both sides' *values* are functions the way the runtime check does. Holds
 * for every real contract-authored handler prop (always typed as a function on both sides); a
 * named simplification, not a silent assumption.
 */
export type ClassifyPropKey<K extends PropertyKey> = K extends 'className' | 'class'
  ? 'concat'
  : K extends 'style'
    ? 'shallow-merge'
    : K extends `on${string}`
      ? 'chain'
      : 'child-wins'

/**
 * The type-side consequence of `ComposeOptions`'s own doc comment: "forwarding is only safe when
 * `with`'s own contract is known not to have variant/prop names that collide with this
 * component's own." A `'child-wins'`-category key present on both sides with incompatible types
 * resolves to this literal instead of silently picking a direction.
 */
export type CollisionError<K extends PropertyKey> =
  `compose: '${K & string}' is declared by both this component and its composed partner with incompatible types`

/** The value a merged key resolves to, independent of whether that key ends up optional or
 *  required in the final result — split out so optionality (below) can be computed separately
 *  from the value itself. */
type MergeComposedValue<Own, Composed, K extends PropertyKey> = K extends keyof Own
  ? K extends keyof Composed
    ? ClassifyPropKey<K> extends 'child-wins'
      ? Own[K] extends Composed[K]
        ? Own[K]
        : Composed[K] extends Own[K]
          ? Composed[K]
          : CollisionError<K>
      : Own[K] | Composed[K]
    : Own[K]
  : K extends keyof Composed
    ? Composed[K]
    : never

/** Every key `T` declares with a `?` modifier — the standard "collect optional keys" idiom
 *  (`{} extends Pick<T, K>` is true exactly when `K` can be omitted). Needed because
 *  `MergeComposedProps`'s key set (`keyof Own | keyof Composed`) isn't a plain `keyof` of a
 *  single type, so it isn't a *homomorphic* mapped type — TypeScript only auto-preserves a
 *  source type's own `?`/`readonly` modifiers for a mapped type written as `{ [K in keyof
 *  T]: ... }` for one concrete `T`, not for a key union assembled from two different types. A
 *  naive `{ [K in keyof Own | keyof Composed]: ... }` silently drops every `?`, turning a
 *  genuinely optional own-prop into a required-but-possibly-`undefined` one — confirmed directly
 *  by a real-component test (`adapters/react/src/current/compose-props.test.tsx`) once an actual
 *  contract used an optional prop, which every one of this package's own earlier (required-only)
 *  test fixtures had never exercised. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the empty-object-literal idiom for "this key can be omitted", not a real empty-interface declaration
type OptionalKeysOf<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T]

/** Whether `K` is optional *as declared on `T` specifically* — `true` both when `T` marks it
 *  optional and when `T` doesn't declare `K` at all (nothing to require from that side). Only
 *  meaningful combined with the other side's own answer below; on its own it can't distinguish
 *  "optional" from "absent," which is exactly why `IsMergedKeyOptional` below checks presence
 *  before consulting this. */
type IsOptionalOn<T, K extends PropertyKey> = K extends keyof T
  ? K extends OptionalKeysOf<T>
    ? true
    : false
  : true

/** A merged key is optional iff it's optional (or simply absent) on *every* side that actually
 *  declares it — required on at least one declaring side makes the merged result required too,
 *  since a caller composing both components still owes that value to whichever side requires
 *  it. Checking presence on each side separately (rather than reusing one combined check) is
 *  what makes a key declared `required` only on `Composed` (and absent from `Own` entirely)
 *  correctly stay required — the first version of this type collapsed "absent from Own" and
 *  "optional on Own" into the same answer, silently turning every composed-only required prop
 *  optional. */
type IsMergedKeyOptional<Own, Composed, K extends PropertyKey> = K extends keyof Own
  ? K extends keyof Composed
    ? IsOptionalOn<Own, K> extends true
      ? IsOptionalOn<Composed, K>
      : false
    : IsOptionalOn<Own, K>
  : K extends keyof Composed
    ? IsOptionalOn<Composed, K>
    : true

type AllMergedKeys<Own, Composed> = keyof Own | keyof Composed

type MergedOptionalKeys<Own, Composed> = {
  [K in AllMergedKeys<Own, Composed>]: IsMergedKeyOptional<Own, Composed, K> extends true
    ? K
    : never
}[AllMergedKeys<Own, Composed>]

/**
 * Own-vs-composed key merge, resolved per `ClassifyPropKey`. `'chain'`/`'concat'`/
 * `'shallow-merge'` keys are safe to coexist on both sides (the runtime combinator makes sense
 * for two different values, hence the union rather than a collision check); a `'child-wins'` key
 * on both sides is only safe when the two types agree — otherwise it's a real authoring conflict,
 * surfaced as `CollisionError<K>` rather than resolved either direction. Built as two separate
 * mapped types (required keys, then optional keys) rather than one, so each half can apply its
 * own `?` modifier explicitly — see `OptionalKeysOf`'s own comment for why a single mapped type
 * over `keyof Own | keyof Composed` can't do this automatically.
 */
export type MergeComposedProps<Own, Composed> = {
  [K in Exclude<AllMergedKeys<Own, Composed>, MergedOptionalKeys<Own, Composed>>]: MergeComposedValue<
    Own,
    Composed,
    K
  >
} & {
  [K in MergedOptionalKeys<Own, Composed>]?: MergeComposedValue<Own, Composed, K>
}
