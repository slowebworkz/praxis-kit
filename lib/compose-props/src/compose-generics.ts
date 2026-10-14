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
 * Every one of the five named types below exists for the same reason: a generic argument fed
 * into `PolymorphicGenerics<...>` from within `ContractGenericsWithComposeOf`'s own
 * self-referential conditional needs an `extends infer X extends Constraint ? X : Constraint`
 * guard, confirmed necessary by a real-component test
 * (`adapters/react/src/current/compose-props.test.tsx`) that caught `ContractAllowedOf<C>`
 * silently widening to the full default `ElementType` when passed through unguarded — even
 * though it resolves correctly in total isolation, and even though sibling arguments in the same
 * call resolved correctly unguarded. This is TypeScript silently falling back to a type
 * parameter's own default rather than erroring, for a generic argument that depends on this
 * alias's own self-reference, not a rule about which position breaks — so every argument gets
 * its own named, guarded type, not only the one a specific test happened to catch.
 */
type DefaultTagOf<C extends FactoryOptions> =
  ContractTagOf<C> extends infer TDefault extends ElementType ? TDefault : ElementType

type PresetOf<C extends FactoryOptions> =
  ContractPresetOf<C> extends infer TPreset extends RecipeMap<Readonly<VariantMap>>
    ? TPreset
    : Readonly<EmptyRecord>

type AllowedOf<C extends FactoryOptions> =
  ContractAllowedOf<C> extends infer TAllowed extends ElementType ? TAllowed : ElementType

/**
 * `C`'s own props/variants with the index signature `ContractPropsOf<C>`/`ContractVariantsOf<C>`
 * carry (`DeclaredPropsFrom`'s `& AnyRecord`, `@praxis-kit/primitive`) stripped first. Once two
 * such index-signature-carrying objects are unioned via `keyof Own | keyof Composed`, `keyof`
 * absorbs every literal key into the bare `string` the index signature already implies, so
 * `MergeComposedProps`'s per-key mapped type would silently degrade to iterating over `string`
 * instead of each contract's actual declared keys. Stripping here, before the merge, keeps
 * `keyof` resolved to the real literal key union on both sides.
 */
type OwnPropsOf<C extends FactoryOptions> = OmitIndexSignature<ContractPropsOf<C>>
type OwnVariantsOf<C extends FactoryOptions> = OmitIndexSignature<ContractVariantsOf<C>>

/**
 * The composed partner's own effective props/variants — **recursing on
 * `ContractGenericsWithComposeOf<CC>`**, not on `CC`'s own raw, undecorated contract. If `CC`
 * itself composes a third component, projecting `CC`'s raw contract would silently drop that
 * third component's props from `C`'s own resolved type; recursing on the already-composed result
 * instead makes this one definition correct at every depth, bounded naturally by the real, finite
 * chain of `compose.with` references. See `docs/design/compose-props-typing.md` (section 3) —
 * this distinction is the one the validation spike's nested-composition assertion caught on the
 * first implementation attempt. Index-signature-stripped for the same reason as `OwnPropsOf`.
 */
type ComposedPropsOf<CC extends FactoryOptions> = OmitIndexSignature<
  PropsOf<ContractGenericsWithComposeOf<CC>>
>
type ComposedVariantsOf<CC extends FactoryOptions> = OmitIndexSignature<
  VariantsOf<ContractGenericsWithComposeOf<CC>>
>

/**
 * `C`'s own props merged with `CC`'s, guarded against `AnyRecord` — `MergeComposedProps` always
 * produces a plain object here (props have nowhere to produce an invalid shape the way variants
 * can; see `MergeVariantsOf`), so this guard exists for the same self-reference reason every
 * other argument in this file is guarded, not because props merging can actually fail the
 * constraint.
 */
type MergePropsOf<C extends FactoryOptions, CC extends FactoryOptions> = MergeComposedProps<
  OwnPropsOf<C>,
  ComposedPropsOf<CC>
> extends infer MergedProps extends AnyRecord
  ? MergedProps
  : AnyRecord

/**
 * `C`'s own variants merged with `CC`'s, guarded against `Readonly<VariantMap>`. Unlike
 * `MergePropsOf`, this guard is load-bearing: `MergeComposedProps` can legitimately produce a
 * `CollisionError<K>` string literal for a colliding key (by design — see `merge-policy.ts`),
 * which isn't a valid `VariantStates<string>`. `PolymorphicGenerics`'s own
 * `Variants extends Readonly<VariantMap>` constraint is checked against this alias's declaration
 * for every possible `C`, not just collision-free ones, so a real collision here resolves to
 * `never` rather than failing the whole alias's own type-check. Confirmed by direct test that this
 * `never` fallback triggers only when the *whole* merged object fails the constraint, not per
 * colliding key — non-colliding variant keys survive alongside a colliding one's own
 * `CollisionError` value (see `compose-generics.test.ts`).
 */
type MergeVariantsOf<C extends FactoryOptions, CC extends FactoryOptions> = MergeComposedProps<
  OwnVariantsOf<C>,
  ComposedVariantsOf<CC>
> extends infer MergedVariants extends Readonly<VariantMap>
  ? MergedVariants
  : never

/**
 * The `PolymorphicGenerics` a composing component's `ContractProps<T>` actually needs — `C`'s own
 * props/variants with its composed partner's folded in, falling back to the untouched
 * `ContractGenericsOf<C>` when there's nothing to compose, so a non-composing contract's
 * extracted type is provably unchanged.
 */
export type ContractGenericsWithComposeOf<C extends FactoryOptions> =
  ComposedContractOf<C> extends infer CC
    ? [CC] extends [never]
      ? ContractGenericsOf<C>
      : CC extends FactoryOptions
        ? PolymorphicGenerics<
            DefaultTagOf<C>,
            MergePropsOf<C, CC>,
            MergeVariantsOf<C, CC>,
            PresetOf<C>,
            AllowedOf<C>
          >
        : never
    : never
