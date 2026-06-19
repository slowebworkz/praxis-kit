import type {
  DefaultOf,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@praxis-kit/core'
import type { WebFactoryOptions } from './web-options'

export type NormalizedOptions<G extends PolymorphicGenerics> = WebFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  RecipeOf<G>
> & {
  readonly name: string
  readonly strict: Exclude<StrictMode, undefined>
}
