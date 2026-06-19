import type {
  DefaultOf,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@praxis-kit/core'
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
  readonly strict: Exclude<StrictMode, undefined>
}
