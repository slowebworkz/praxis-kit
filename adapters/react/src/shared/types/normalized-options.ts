import type {
  DefaultOf,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@praxis-kit/core'
import type { ReactFactoryOptions } from '../react-options'
import type { SlotComponent } from './primitives'

export type NormalizedOptions<G extends PolymorphicGenerics> = ReactFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  RecipeOf<G>
> & {
  readonly slotComponent: SlotComponent
  readonly name: string
  readonly strict: Exclude<StrictMode, undefined>
}
