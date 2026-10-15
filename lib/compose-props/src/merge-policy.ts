import type { OptionalKeysOf } from 'type-fest'

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

/**
 * `CollisionError<K>` wrapped as a single-key `VariantStates`-shaped object, for use at a
 * *variant's* value position instead of the raw string `CollisionError<K>` props use — a raw
 * string there isn't structurally a `VariantStates` (`Record<string, VariantValue>` requires an
 * object), which poisons the whole merged variants object, not just the colliding key (see
 * `docs/design/compose-props-typing.md` for the confirmed failure mode and fix history). The
 * wrapped shape keeps the surrounding object valid; `VariantKey<V, K>` (`@praxis-kit/primitive`)
 * reads `keyof V[K]`, recovering the message itself, so the consumer-facing prop still ends up
 * `CollisionError<K> | undefined` — the same outward result as a props collision.
 */
type VariantCollisionError<K extends PropertyKey> = Record<CollisionError<K>, never>

/**
 * The value a merged key resolves to, independent of whether that key ends up optional or
 * required in the final result — split out so optionality (below) can be computed separately
 * from the value itself. `AsVariants` selects which collision shape applies; every call site in
 * this package passes a literal (`true` for variants, omitted/`false` for props) — passing a
 * non-literal `boolean` would let this conditional distribute and produce a union of both
 * shapes, so keep it literal at any new call site too.
 */
type MergeComposedValue<
  Own,
  Composed,
  K extends PropertyKey,
  AsVariants extends boolean = false,
> = K extends keyof Own
  ? K extends keyof Composed
    ? ClassifyPropKey<K> extends 'child-wins'
      ? Own[K] extends Composed[K]
        ? Own[K]
        : Composed[K] extends Own[K]
          ? Composed[K]
          : AsVariants extends true
            ? VariantCollisionError<K>
            : CollisionError<K>
      : Own[K] | Composed[K]
    : Own[K]
  : K extends keyof Composed
    ? Composed[K]
    : never

/**
 * Whether `K` is optional *as declared on `T` specifically* — `true` both when `T` marks it
 * optional and when `T` doesn't declare `K` at all. Only meaningful combined with the other
 * side's own answer below; `IsMergedKeyOptional` checks presence on each side before consulting
 * this, since on its own it can't distinguish "optional" from "absent." Uses `type-fest`'s own
 * `OptionalKeysOf`, which is why `T` is constrained to `object` here and propagated up through
 * every type below that reaches it.
 */
type IsOptionalOn<T extends object, K extends PropertyKey> = K extends keyof T
  ? K extends OptionalKeysOf<T>
    ? true
    : false
  : true

/**
 * A merged key is optional iff it's optional (or absent) on *every* side that actually declares
 * it — required on at least one declaring side makes the merged result required too, since a
 * caller composing both components still owes that value to whichever side requires it.
 * Checking presence on each side separately (rather than one combined check) is what keeps a key
 * required-only-on-`Composed`-and-absent-from-`Own` correctly required.
 */
type IsMergedKeyOptional<Own extends object, Composed extends object, K extends PropertyKey> =
  K extends keyof Own
    ? K extends keyof Composed
      ? IsOptionalOn<Own, K> extends true
        ? IsOptionalOn<Composed, K>
        : false
      : IsOptionalOn<Own, K>
    : K extends keyof Composed
      ? IsOptionalOn<Composed, K>
      : true

type AllMergedKeys<Own extends object, Composed extends object> = keyof Own | keyof Composed

type MergedOptionalKeys<Own extends object, Composed extends object> = {
  [K in AllMergedKeys<Own, Composed>]: IsMergedKeyOptional<Own, Composed, K> extends true
    ? K
    : never
}[AllMergedKeys<Own, Composed>]

/**
 * Own-vs-composed key merge, resolved per `ClassifyPropKey`. `'chain'`/`'concat'`/
 * `'shallow-merge'` keys are safe to coexist on both sides (the runtime combinator makes sense
 * for two different values, hence the union rather than a collision check); a `'child-wins'` key
 * on both sides is only safe when the two types agree — otherwise it's a real authoring conflict,
 * surfaced as a collision placeholder rather than resolved either direction (`CollisionError<K>`
 * for props, `VariantCollisionError<K>` for variants via `AsVariants: true`). Built as two
 * separate mapped types (required keys, then optional keys) rather than one, so each half can
 * apply its own `?` modifier explicitly.
 */
type MergeComposedPropsMember<
  Own extends object,
  Composed extends object,
  AsVariants extends boolean,
> = {
  [K in Exclude<
    AllMergedKeys<Own, Composed>,
    MergedOptionalKeys<Own, Composed>
  >]: MergeComposedValue<Own, Composed, K, AsVariants>
} & {
  [K in MergedOptionalKeys<Own, Composed>]?: MergeComposedValue<Own, Composed, K, AsVariants>
}

/**
 * Merge each union member independently. Contracts may contribute mutually-exclusive prop unions
 * (notably the Tailwind layout shorthand `{ flex: true } | { grid: true } | ...`). Computing
 * `keyof Own` or mapped keys against the union as a whole only sees keys shared by every member;
 * this can erase a valid primary prop and make it resolve to `never` when the composed partner
 * does not declare that prop. Distribution retains the primary contract's exclusivity while still
 * applying the same per-key collision policy to each member.
 */
export type MergeComposedProps<
  Own extends object,
  Composed extends object,
  AsVariants extends boolean = false,
> = Own extends unknown
  ? Composed extends unknown
    ? MergeComposedPropsMember<Own, Composed, AsVariants>
    : never
  : never
