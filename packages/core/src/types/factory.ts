import type { Arguments, PipelineFactory } from '@praxis-kit/pipeline-kit'
import type {
  AnyRecord,
  ElementType,
  RecipeMap,
  ResolvedFactoryOptions,
  VariantMap,
} from '@praxis-kit/primitive'

export type {
  AnyFactoryOptions,
  EnforcementOptions,
  FactoryOptions,
  NormalizeFn,
  PropNormalizer,
  StylingOptions,
  AllowedOf,
  DefaultOf,
  PolymorphicGenerics,
  PropsOf,
  RecipeOf,
  VariantsOf,
  ResolveInput,
  ResolveOutput,
  ResolverOptions,
} from '@praxis-kit/primitive'

/** The erased/common `ResolvedFactoryOptions` shape every render pipeline is built from. */
export type ResolvedFactoryShape = ResolvedFactoryOptions<
  ElementType,
  AnyRecord,
  VariantMap,
  RecipeMap<VariantMap>
>

/** A PipelineFactory keyed on the shared `ResolvedFactoryShape` — every render-time mechanism
 *  (tag, props, classes, aria) is one of these, so each shares the same memoization and
 *  composition model instead of following a bespoke construction path. */
export type RenderPipeline<TArgs extends Arguments, TResult> = PipelineFactory<
  ResolvedFactoryShape,
  TArgs,
  TResult
>
