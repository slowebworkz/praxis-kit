import type {
  DefaultOf,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@polymorphic-ui/core'
import type { PreactFactoryOptions } from '../preact-options'
import type { SlotComponent } from './primitives'

export type NormalizedOptions<G extends PolymorphicGenerics> = PreactFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  PresetOf<G>
> & {
  readonly slotComponent: SlotComponent
  readonly name: string
  readonly strict: Exclude<StrictMode, undefined>
}
