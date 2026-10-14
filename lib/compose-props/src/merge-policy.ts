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
 * Own-vs-composed key merge, resolved per `ClassifyPropKey`. `'chain'`/`'concat'`/
 * `'shallow-merge'` keys are safe to coexist on both sides (the runtime combinator makes sense
 * for two different values, hence the union rather than a collision check); a `'child-wins'` key
 * on both sides is only safe when the two types agree — otherwise it's a real authoring conflict,
 * surfaced as `CollisionError<K>` rather than resolved either direction.
 */
export type MergeComposedProps<Own, Composed> = {
  [K in keyof Own | keyof Composed]: K extends keyof Own
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
}
