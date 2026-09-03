import type {
  DefaultOf,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantsOf,
} from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { PreactFactoryOptions } from '../preact-options'
import type { SlotComponent } from './primitives'

export type NormalizedOptions<G extends PolymorphicGenerics> = PreactFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  RecipeOf<G>
> & {
  readonly slotComponent: SlotComponent
  readonly name: string
  readonly diagnostics: Diagnostics
}
