import type {
  AllowedOf,
  AnyRecord,
  DefaultOf,
  PolymorphicGenerics,
  PropsOf,
  RecipeMap,
  RecipeOf,
  VariantsOf,
  VariantMap,
} from '@praxis-kit/core'
import type { MergeComposedProps } from '@praxis-kit/compose-props'
import type { DistributiveOmitIndexSignature } from './omit-index-signature'
import type { BuiltRuntime } from './built-runtime'

/** Props of `G` with index signatures stripped. */
type OwnProps<G extends PolymorphicGenerics> = DistributiveOmitIndexSignature<PropsOf<G>>

/** Variants of `G` with index signatures stripped. */
type OwnVariants<G extends PolymorphicGenerics> = DistributiveOmitIndexSignature<VariantsOf<G>>

/**
 * Keeps `G`'s recipe map when it fits the merged variants `V`, else falls back to a plain
 * `RecipeMap<V>`.
 */
type PresetFor<G extends PolymorphicGenerics, V extends Readonly<VariantMap>> =
  RecipeOf<G> extends RecipeMap<V> ? RecipeOf<G> : RecipeMap<V>

/** Extracts the generics a `BuiltRuntime` was built with. */
type OwnGenericsOf<T> = T extends BuiltRuntime<infer G, infer _Options> ? G : PolymorphicGenerics

/** Extracts the `compose` options from a runtime's options, or `never` if absent. */
type CompositionOptionsOf<T> = T extends { readonly compose?: infer Options }
  ? NonNullable<Options>
  : never

/** Effective generics of a `BuiltRuntime` after resolving its `compose` options. */
type ComposedGenericsOf<T> =
  T extends BuiltRuntime<infer G, infer _Options>
    ? ResolveComposition<G, CompositionOptionsOf<T>>
    : PolymorphicGenerics

/** `true` when `compose.allProps` is enabled. */
type ForwardPropsOf<Options> = Options extends { readonly allProps: true } ? true : false

/** The `compose.with` partner when it carries a runtime, else `never`. */
type ComposedTargetOf<Options> = Options extends { readonly with: infer Target }
  ? Target extends { readonly runtime: unknown }
    ? Target
    : never
  : never

/** Own props, merged with the partner's props only when props are forwarded. */
type PropsForComposition<
  Own extends PolymorphicGenerics,
  Composed extends PolymorphicGenerics,
  ForwardProps extends boolean,
> = ForwardProps extends true
  ? MergeComposedProps<OwnProps<Own>, OwnProps<Composed>>
  : OwnProps<Own>

/** Own variants merged with the partner's variants. */
type VariantsForComposition<
  Own extends PolymorphicGenerics,
  Composed extends PolymorphicGenerics,
> = MergeComposedProps<OwnVariants<Own>, OwnVariants<Composed>, true>

/** Resolves `G` against the composition options: unchanged without a partner, merged with one. */
type ResolveComposition<G extends PolymorphicGenerics, Options> =
  [ComposedTargetOf<Options>] extends [never]
    ? G
    : MergeGenerics<G, OwnGenericsOf<ComposedTargetOf<Options>>, ForwardPropsOf<Options>>

/**
 * Builds merged `PolymorphicGenerics` from own and composed generics, falling back to `Own` if a
 * merge fails.
 */
type MergeGenerics<
  Own extends PolymorphicGenerics,
  Composed extends PolymorphicGenerics,
  ForwardProps extends boolean,
> =
  PropsForComposition<Own, Composed, ForwardProps> extends infer Props extends AnyRecord
    ? VariantsForComposition<Own, Composed> extends infer Variants extends Readonly<VariantMap>
      ? PolymorphicGenerics<
          DefaultOf<Own>,
          Props,
          Variants,
          PresetFor<Own, Variants>,
          AllowedOf<Own>
        >
      : Own
    : Own

/**
 * Recovers a Svelte bundle's effective generics, folding in the direct composed partner's variants
 * whenever `compose.with` is present, and its ordinary props only when `compose.allProps` is enabled.
 * Projection is intentionally one level deep to match the current Svelte runtime, which does not
 * render a partner's own composition recursively.
 * The original options are inferred from `BuiltRuntime`'s second generic parameter; no runtime
 * marker is required.
 */
export type ComposedBundleGenericsOf<T> = ComposedGenericsOf<T>
