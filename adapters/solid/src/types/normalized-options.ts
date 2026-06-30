import type {
  DefaultOf,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantsOf,
} from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { SolidFactoryOptions } from '../solid-options'

export type NormalizedOptions<G extends PolymorphicGenerics> = SolidFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  RecipeOf<G>
> & {
  readonly name: string
  readonly diagnostics: Diagnostics
}
