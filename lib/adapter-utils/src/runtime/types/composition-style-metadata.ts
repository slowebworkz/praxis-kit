import type {
  AnyRecord,
  ElementType,
  RecipeMap,
  ResolvedFactoryOptions,
  VariantMap,
} from '@praxis-kit/core'
import type { ClassPipelineOptions } from '@praxis-kit/styling'

export type RuntimeOptions = ResolvedFactoryOptions<
  ElementType,
  AnyRecord,
  VariantMap,
  RecipeMap<VariantMap>
>

export type StyleMetadata = ClassPipelineOptions<VariantMap>
