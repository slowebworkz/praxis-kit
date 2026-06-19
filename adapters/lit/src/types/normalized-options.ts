import type {
  DefaultOf,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@praxis-kit/core'
import type { LitFactoryOptions } from './lit-options'

export type NormalizedOptions<G extends PolymorphicGenerics> = LitFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  RecipeOf<G>
> & {
  readonly name: string
  readonly strict: Exclude<StrictMode, undefined>
}
