import type { OptionalKeysOf } from 'type-fest'

/**
 * Type-level mirror of the runtime slot-merge policy (`classifyProp`,
 * `lib/adapter-utils/src/slot/merge-slot-props.ts`) that `compose: { with, allProps: true }`
 * reaches through `asChild`/`Slot`. The four categories match `PROP_MERGE_POLICIES`
 * (`lib/adapter-utils/src/slot/policies.ts`). They are kept in sync by hand, not by a shared
 * import, since one side is a runtime value tuple and the other a type: a change to
 * `classifyProp`'s classification must be mirrored here.
 */
export type PropMergeCategory = 'chain' | 'concat' | 'shallow-merge' | 'child-wins'

/**
 * Approximates `classifyProp`'s `EVENT_HANDLER_RE.test(key) &&
 * isFunction(slotVal) && isFunction(childVal)` check with a key-name pattern
 * alone (`on${string}`). Types cannot additionally confirm that both sides'
 * values are functions, as the runtime check does.
 *
 * This holds for every contract-authored handler prop, which is typed as a
 * function on both sides.
 */
export type ClassifyPropKey<K extends PropertyKey> = K extends 'className' | 'class'
  ? 'concat'
  : K extends 'style'
    ? 'shallow-merge'
    : K extends `on${string}`
      ? 'chain'
      : 'child-wins'

/**
 * The type-level diagnostic for a prop declared by both components with
 * incompatible types.
 */
export type CollisionError<K extends PropertyKey> =
  `compose: '${K & string}' is declared by both this component and its composed partner with incompatible types`

/**
 * Wraps a collision diagnostic in a `VariantStates`-compatible object shape.
 *
 * A raw string diagnostic at a variant value position would violate the
 * variant-map constraint and poison the entire merged variants object.
 * Wrapping it preserves the surrounding object; `VariantKey<V, K>` recovers
 * the diagnostic from the wrapper's key so the consumer-facing prop retains
 * the same error shape as a prop collision.
 *
 * On an incompatible variant collision the primary definition wins at runtime, so the merged
 * variant is `Own[K] & VariantCollisionError<K>`: the consumer-facing prop accepts the primary's
 * own values, still carries the collision message so the collision is surfaced, and rejects a
 * value that is valid only under the partner's conflicting definition.
 */
type VariantCollisionError<K extends PropertyKey> = Record<CollisionError<K>, never>

/**
 * Resolves the collision result for a key declared on both sides.
 *
 * Identical or assignable types are compatible. Incompatible types produce
 * a diagnostic whose shape depends on whether this merge represents props
 * or variants.
 *
 * `AsVariants` must remain a literal at call sites (`true` for variants, omitted/`false` for
 * props): a non-literal `boolean` would let this conditional distribute and produce a union of
 * both collision shapes.
 */
type MergeChildWinsValue<
  Own,
  Composed,
  K extends keyof Own & keyof Composed,
  AsVariants extends boolean,
> = Own[K] extends Composed[K]
  ? Own[K]
  : Composed[K] extends Own[K]
    ? Composed[K]
    : AsVariants extends true
      ? Own[K] & VariantCollisionError<K>
      : CollisionError<K>

/**
 * Resolves the value contributed by a key, independently of whether the key
 * will be optional or required in the resulting object.
 *
 * Keys classified as `child-wins` use the collision policy. Keys classified
 * as `chain`, `concat`, or `shallow-merge` can coexist, so their types are
 * combined as a union.
 */
type MergeComposedValue<
  Own,
  Composed,
  K extends PropertyKey,
  AsVariants extends boolean = false,
> = K extends keyof Own
  ? K extends keyof Composed
    ? ClassifyPropKey<K> extends 'child-wins'
      ? MergeChildWinsValue<Own, Composed, K, AsVariants>
      : Own[K] | Composed[K]
    : Own[K]
  : K extends keyof Composed
    ? Composed[K]
    : never

/**
 * Whether `K` is optional on `T`.
 *
 * A missing key returns `true`, so callers must account for key presence
 * before interpreting this result as actual optionality.
 */
type IsOptionalOn<T extends object, K extends PropertyKey> = K extends keyof T
  ? K extends OptionalKeysOf<T>
    ? true
    : false
  : true

/**
 * A key declared on both sides is optional only when both declarations are
 * optional. A required declaration on either side makes the merged key
 * required.
 */
type IsOptionalOnBoth<
  Own extends object,
  Composed extends object,
  K extends keyof Own & keyof Composed,
> = IsOptionalOn<Own, K> extends true ? IsOptionalOn<Composed, K> : false

/**
 * Determines whether a merged key is optional, taking account of which sides
 * declare it.
 *
 * A key declared by only one side inherits that side's optionality. A key
 * declared by neither side is treated as optional.
 */
type IsMergedKeyOptional<
  Own extends object,
  Composed extends object,
  K extends PropertyKey,
> = K extends keyof Own
  ? K extends keyof Composed
    ? IsOptionalOnBoth<Own, Composed, K>
    : IsOptionalOn<Own, K>
  : K extends keyof Composed
    ? IsOptionalOn<Composed, K>
    : true

/** All keys contributed by either side. */
type AllMergedKeys<Own extends object, Composed extends object> = keyof Own | keyof Composed

/** The subset of merged keys that should be optional. */
type MergedOptionalKeys<Own extends object, Composed extends object> = {
  [K in AllMergedKeys<Own, Composed>]: IsMergedKeyOptional<Own, Composed, K> extends true
    ? K
    : never
}[AllMergedKeys<Own, Composed>]

/**
 * Merges a single pair of prop members.
 *
 * Required and optional properties are expressed as separate mapped types so
 * each group can apply its own optional modifier explicitly.
 */
type MergeComposedPropsMember<
  Own extends object,
  Composed extends object,
  AsVariants extends boolean,
> = {
  [
    K in Exclude<AllMergedKeys<Own, Composed>, MergedOptionalKeys<Own, Composed>>
  ]: MergeComposedValue<Own, Composed, K, AsVariants>
} & {
  [K in MergedOptionalKeys<Own, Composed>]?: MergeComposedValue<Own, Composed, K, AsVariants>
}

/**
 * Distributes over each union member on both sides before merging.
 *
 * This preserves member-specific keys in mutually exclusive prop unions,
 * such as plugin-generated layout props, instead of allowing `keyof` on the
 * whole union to discard keys that are not shared by every member.
 */
type MergeComposedPropsDistributive<
  Own extends object,
  Composed extends object,
  AsVariants extends boolean,
> = Own extends unknown
  ? Composed extends unknown
    ? MergeComposedPropsMember<Own, Composed, AsVariants>
    : never
  : never

/**
 * Exact type comparison used to avoid an unnecessary union cross-product.
 *
 * Bidirectional assignability alone is insufficient: an empty record can be
 * assignable to shapes whose properties are all optional. This check is
 * intended to recognize identical types, including identical unions.
 */
type IsSameType<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

/**
 * Merges a component's own props with those of its composed partner.
 *
 * Identical types take the fast path, avoiding a quadratic cross-product of
 * union members. Different types use the distributive merge so member-
 * specific keys and collision diagnostics are retained.
 */
export type MergeComposedProps<
  Own extends object,
  Composed extends object,
  AsVariants extends boolean = false,
> =
  IsSameType<Own, Composed> extends true
    ? Own
    : MergeComposedPropsDistributive<Own, Composed, AsVariants>
