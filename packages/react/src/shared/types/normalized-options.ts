import type {
  DefaultOf,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  VariantsOf,
} from '@polymorphic-ui/core'
import type { ReactFactoryOptions } from '../react-options'
import type { SlotComponent } from './primitives'

export type NormalizedOptions<G extends PolymorphicGenerics> = ReactFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  PresetOf<G>
> & {
  readonly slotComponent: SlotComponent
  readonly strict: Exclude<
    ReactFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>['strict'],
    undefined
  >
  readonly displayName: string
}
