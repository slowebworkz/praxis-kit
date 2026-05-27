import type {
  DefaultOf,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@praxis-ui/core'
import type { ReactFactoryOptions } from '../react-options'
import type { SlotComponent } from './primitives'

export type NormalizedOptions<G extends PolymorphicGenerics> = ReactFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  PresetOf<G>
> & {
  readonly slotComponent: SlotComponent
  readonly name: string
  readonly strict: Exclude<StrictMode, undefined>
}
