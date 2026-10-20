import type { OmitIndexSignature } from 'type-fest'
import type {
  AnyRecord,
  ContractAllowedOf,
  ContractGenericsOf,
  ContractPresetOf,
  ContractTagOf,
  ContractVariantsOf,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PolymorphicGenerics,
  PropsOf,
  RecipeMap,
  VariantMap,
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
export type RecoveredContractOf<T> =
  T extends HasContract<infer C extends FactoryOptions> ? C : never

/**
 * `C`'s direct composed partner's contract, or `never` if `C` has no `compose.with` or
 * `with` isn't a recognizable Praxis component. Composition styling variants are public whenever
 * `with` exists; `allProps` gates only the partner's ordinary props, handled separately by
 * `MergePropsOf`.
 */
export type ComposedContractOf<C extends FactoryOptions> = C extends {
  compose: { with: infer W }
}
  ? RecoveredContractOf<W>
  : never

/**
 * Each named helper below exists for the same reason: a generic argument fed
 * into `PolymorphicGenerics<...>` from within `ContractGenericsWithComposeOf`'s own
 * self-referential conditional needs an `extends infer X extends Constraint ? X : Constraint`
 * guard, confirmed necessary by a real-component test
 * (`adapters/react/src/current/compose-props.test.tsx`) that caught `ContractAllowedOf<C>`
 * silently widening to the full default `ElementType` when passed through unguarded — even
 * though it resolves correctly in total isolation, and even though sibling arguments in the same
 * call resolved correctly unguarded. This is TypeScript silently falling back to a type
 * parameter's own default rather than erroring, for a generic argument that depends on this alias's
 * own self-reference, not a rule about which position breaks — so every argument gets its own
 * named, guarded type, not only the one a specific test happened to catch.
 */
type DefaultTagOf<C extends FactoryOptions> =
  ContractTagOf<C> extends infer TDefault extends ElementType ? TDefault : ElementType

type PresetOf<C extends FactoryOptions> =
  ContractPresetOf<C> extends infer TPreset extends RecipeMap<Readonly<VariantMap>>
    ? TPreset
    : Readonly<EmptyRecord>

/**
 * Merge partner recipes first and primary recipes second, matching runtime recipe precedence.
 * Duplicate recipe names retain partner-only variant selections while primary values override
 * the same variant key. Only the direct partner's declared preset map is used here; nested
 * composition remains the partner component's own rendering responsibility.
 */
type MergePresetMaps<
  Partner extends RecipeMap<Readonly<VariantMap>>,
  Primary extends RecipeMap<Readonly<VariantMap>>,
> = {
  [Name in keyof Partner | keyof Primary]: Name extends keyof Primary
    ? Name extends keyof Partner
      ? MergeSelections<Partner[Name], Primary[Name]>
      : Primary[Name]
    : Name extends keyof Partner
      ? Partner[Name]
      : never
}

/** One recipe's variant selections: the primary's value wins a shared variant key. */
type MergeSelections<Partner, Primary> = {
  [Key in keyof Partner | keyof Primary]: Key extends keyof Primary
    ? Primary[Key]
    : Key extends keyof Partner
      ? Partner[Key]
      : never
}

type AllowedOf<C extends FactoryOptions> =
  ContractAllowedOf<C> extends infer TAllowed extends ElementType ? TAllowed : ElementType

/**
 * Strips index signatures before composition. The effective props and variants can carry index
 * signatures from the primitive contract types. Once two such objects are merged, `keyof` can
 * absorb every literal key into the broad index signature, preventing `MergeComposedProps` from
 * iterating over each contract's actual declared keys.
 */
type StripIndexSignature<T> = T extends object ? OmitIndexSignature<T> : T

/**
 * `C`'s own effective props, including props contributed by plugins, with index signatures
 * stripped before composition. Deriving these from `ContractGenericsOf<C>` rather than
 * `ContractPropsOf<C>` is important: raw contract props do not necessarily include plugin
 * contributions such as layout variants (`flex`, `grid`, etc.).
 *
 * Keep the conditional distributive: a layout plugin can contribute a mutually exclusive union.
 * Distributing before stripping index signatures preserves member-specific keys so composition
 * doesn't lose a key such as `flex` when the composed partner doesn't declare it.
 */
type OwnPropsOf<C extends FactoryOptions> = StripIndexSignature<PropsOf<ContractGenericsOf<C>>>
type OwnVariantsOf<C extends FactoryOptions> = StripIndexSignature<ContractVariantsOf<C>>

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
type ComposedPropsOf<CC extends FactoryOptions> = StripIndexSignature<
  PropsOf<ContractGenericsWithComposeOf<CC>>
>

/** Only the direct partner's own styling variants are merged; nested composition remains
 *  that component's rendering responsibility and is not flattened into this component's style
 *  contract. */
type ComposedVariantsOf<CC extends FactoryOptions> = OwnVariantsOf<CC>

/**
 * `C`'s own props merged with `CC`'s, guarded against `AnyRecord` — `MergeComposedProps` always
 * produces a plain object here (props have nowhere to produce an invalid shape the way variants
 * can; see `MergeVariantsOf`), so this guard exists for the same self-reference reason every
 * other argument in this file is guarded, not because props merging can actually fail the
 * constraint.
 */
type MergePropsOf<C extends FactoryOptions, CC extends FactoryOptions> = C extends {
  compose: { allProps: true }
}
  ? MergeComposedProps<OwnPropsOf<C>, ComposedPropsOf<CC>> extends infer MergedProps extends
      AnyRecord
    ? MergedProps
    : AnyRecord
  : OwnPropsOf<C>

/**
 * `C`'s own variants merged with `CC`'s, guarded against `Readonly<VariantMap>`.
 * `MergeComposedProps`'s third argument (`AsVariants`) is set so a collision wraps as a
 * `VariantCollisionError<K>` (a single-key `VariantStates`-shaped placeholder), not a raw
 * `CollisionError<K>` string — load-bearing, not cosmetic: see that type's own comment
 * (`merge-policy.ts`) and `docs/design/compose-props-typing.md` for why a raw string there once
 * poisoned the entire merged object instead of just the colliding key. With the wrapped shape,
 * every per-key value is always a genuine `VariantStates`, so this guard should never actually
 * trigger for a real collision anymore — kept only for the same "guard every self-referential
 * argument" reason every other argument in this file is guarded.
 */
type MergeVariantsOf<C extends FactoryOptions, CC extends FactoryOptions> =
  MergeComposedProps<
    OwnVariantsOf<C>,
    ComposedVariantsOf<CC>,
    true
  > extends infer MergedVariants extends Readonly<VariantMap>
    ? MergedVariants
    : never

/**
 * `C`'s presets merged with `CC`'s, guarded against the recipe constraint on the merged variants
 * for the same self-reference reason as the other `Merge*Of` helpers. The fallback is `C`'s own
 * presets, i.e. composition adds nothing it cannot prove well-formed.
 */
type MergePresetsOf<C extends FactoryOptions, CC extends FactoryOptions> =
  MergePresetMaps<PresetOf<CC>, PresetOf<C>> extends infer MergedPresets extends RecipeMap<
    MergeVariantsOf<C, CC>
  >
    ? MergedPresets
    : PresetOf<C>

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
            MergePresetsOf<C, CC>,
            AllowedOf<C>
          >
        : never
    : never
