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

type OwnProps<G extends PolymorphicGenerics> = DistributiveOmitIndexSignature<PropsOf<G>>
type OwnVariants<G extends PolymorphicGenerics> = DistributiveOmitIndexSignature<VariantsOf<G>>
type PresetFor<G extends PolymorphicGenerics, V extends Readonly<VariantMap>> =
  RecipeOf<G> extends RecipeMap<V> ? RecipeOf<G> : RecipeMap<V>

type OwnGenericsOf<T> = T extends BuiltRuntime<infer G, infer _O> ? G : PolymorphicGenerics

type ComposedGenericsOf<T> = T extends BuiltRuntime<infer G, infer _O>
  ? ResolveComposition<G, T extends { readonly compose?: infer C } ? NonNullable<C> : never>
  : PolymorphicGenerics

type ResolveComposition<
  G extends PolymorphicGenerics,
  O,
> = O extends { readonly allProps: true; readonly with: infer W }
  ? W extends { readonly runtime: unknown }
    ? MergeGenerics<G, OwnGenericsOf<W>>
    : G
  : G

type MergeGenerics<
  Own extends PolymorphicGenerics,
  Composed extends PolymorphicGenerics,
> = MergeComposedProps<OwnProps<Own>, OwnProps<Composed>> extends infer Props extends AnyRecord
  ? MergeComposedProps<OwnVariants<Own>, OwnVariants<Composed>, true> extends infer Variants extends
      Readonly<VariantMap>
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
 * Recovers a Svelte bundle's effective generics, folding in the direct composed partner's own props
 * and variants when `compose.allProps` is enabled. Projection is intentionally one level deep to
 * match the current Svelte runtime, which does not render a partner's own composition recursively.
 * The original options are inferred from `BuiltRuntime`'s second generic parameter; no runtime
 * marker is required.
 */
export type ComposedBundleGenericsOf<T> = ComposedGenericsOf<T>
