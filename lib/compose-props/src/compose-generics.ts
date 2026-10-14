import type { OmitIndexSignature } from 'type-fest'
import type {
  AnyRecord,
  ContractAllowedOf,
  ContractGenericsOf,
  ContractPresetOf,
  ContractPropsOf,
  ContractTagOf,
  ContractVariantsOf,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PolymorphicGenerics,
  PropsOf,
  RecipeMap,
  VariantMap,
  VariantsOf,
} from '@praxis-kit/primitive'
import type { HasContract } from '@praxis-kit/contract-props'
import type { MergeComposedProps } from './merge-policy'

/**
 * Recovers `T`'s own retained contract, if `T` is a praxis-kit-built component (carries
 * `__contract` per `HasContract<C>`). `never` for an arbitrary `ComponentReference` that isn't
 * one of ours — `compose.with` (`ComposeOptions`, `@praxis-kit/primitive`) is deliberately
 * untyped/untrusted at the type level, so this must degrade gracefully rather than require `with`
 * to be a praxis-kit component.
 */
export type RecoveredContractOf<T> = T extends HasContract<infer C extends FactoryOptions>
  ? C
  : never

/**
 * `C`'s composed partner's contract, or `never` if `C` doesn't compose, composition isn't
 * `allProps`, or `with` isn't a recognizable praxis-kit component. Isolates the three-way gate
 * (compose present / `allProps` true / `with` recognizable) in one place instead of repeating it
 * at every downstream read.
 */
export type ComposedContractOf<C extends FactoryOptions> = C extends {
  compose: { allProps: true; with: infer W }
}
  ? RecoveredContractOf<W>
  : never

/**
 * The `PolymorphicGenerics` a composing component's `ContractProps<T>` actually needs — `C`'s own
 * props/variants with its composed partner's folded in via `MergeComposedProps`, falling back to
 * the untouched `ContractGenericsOf<C>` when there's nothing to compose, so a non-composing
 * contract's extracted type is provably unchanged.
 *
 * Deliberately recurses on **`ContractGenericsWithComposeOf<CC>`** for the composed partner, not
 * on `CC`'s own raw, undecorated contract — if `CC` itself composes a third component, projecting
 * `CC`'s raw contract would silently drop that third component's props from `C`'s own resolved
 * type. Recursing on the already-composed result instead makes this one definition correct at
 * every depth, bounded naturally by the real, finite chain of `compose.with` references. See
 * `docs/design/compose-props-typing.md` (section 3) — this distinction is the one the validation
 * spike's nested-composition assertion caught on the first implementation attempt.
 *
 * Both sides are run through `OmitIndexSignature` **before** `MergeComposedProps`, not after.
 * `ContractPropsOf<C>` (`DeclaredPropsFrom`, `@praxis-kit/primitive`) deliberately intersects a
 * component's declared props with `AnyRecord` — real, by-design behavior, not a bug — but once
 * two such index-signature-carrying objects are unioned via `keyof Own | keyof Composed`,
 * `keyof` absorbs every literal key into the bare `string` the index signature already implies,
 * so `MergeComposedProps`'s per-key mapped type silently degrades to iterating over `string`
 * instead of each contract's actual declared keys. Stripping the index signature first keeps
 * `keyof` resolved to the real literal key union on both sides, which is what the per-key
 * collision check in `MergeComposedProps` needs to work correctly at all.
 *
 * **Every argument to `PolymorphicGenerics` below is wrapped in its own
 * `extends infer X extends Constraint ? X : Constraint` guard — confirmed necessary, not
 * defensive padding.** A real-component test (`adapters/react/src/current/compose-props.test.tsx`)
 * caught this directly: passing `ContractAllowedOf<C>` straight through (no guard) silently
 * widened the composed type's `allowed`/`TAllowed` field to the full default `ElementType` —
 * accepting every intrinsic tag, not just the composing component's own declared `allowedAs` —
 * even though `ContractAllowedOf<C>` resolves correctly in total isolation, and even though the
 * sibling `default`/`preset` arguments in the very same call resolved correctly unguarded. This
 * is TypeScript silently falling back to a type parameter's own default rather than erroring, for
 * a generic argument that depends on this alias's own self-reference, not a general rule about
 * which position breaks — so every argument gets the guard, not only the one a specific test
 * happened to catch.
 */
export type ContractGenericsWithComposeOf<C extends FactoryOptions> =
  ComposedContractOf<C> extends infer CC
    ? [CC] extends [never]
      ? ContractGenericsOf<C>
      : CC extends FactoryOptions
        ? PolymorphicGenerics<
            ContractTagOf<C> extends infer TDefault extends ElementType ? TDefault : ElementType,
            MergeComposedProps<
              OmitIndexSignature<ContractPropsOf<C>>,
              OmitIndexSignature<PropsOf<ContractGenericsWithComposeOf<CC>>>
            > extends infer MergedProps extends AnyRecord
              ? MergedProps
              : AnyRecord,
            // `MergeComposedProps` can produce a `CollisionError<K>` string literal for a
            // colliding key (by design — see `merge-policy.ts`), which isn't a valid
            // `VariantStates<string>`. `PolymorphicGenerics`'s own `Variants extends
            // Readonly<VariantMap>` constraint is checked against this alias's declaration for
            // every possible `C`, not just collision-free ones, so a real collision here
            // resolves to `never` rather than failing the whole alias's own type-check — the
            // collision is still visible (anything reading a `never` variants map immediately
            // breaks downstream), just not as a readable embedded string the way a props
            // collision is. Props don't need this guard for that reason: `AnyRecord` accepts a
            // string value regardless.
            MergeComposedProps<
              OmitIndexSignature<ContractVariantsOf<C>>,
              OmitIndexSignature<VariantsOf<ContractGenericsWithComposeOf<CC>>>
            > extends infer MergedVariants extends Readonly<VariantMap>
              ? MergedVariants
              : never,
            ContractPresetOf<C> extends infer TPreset extends RecipeMap<Readonly<VariantMap>>
              ? TPreset
              : Readonly<EmptyRecord>,
            ContractAllowedOf<C> extends infer TAllowed extends ElementType
              ? TAllowed
              : ElementType
          >
        : never
    : never
