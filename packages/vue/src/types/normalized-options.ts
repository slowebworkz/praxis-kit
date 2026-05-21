import type {
  DefaultOf,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  VariantsOf,
} from '@polymorphic-ui/core'
import type { VueFactoryOptions } from '../vue-options'

export type NormalizedOptions<G extends PolymorphicGenerics> = VueFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  PresetOf<G>
> & {
  readonly strict: Exclude<
    VueFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>['strict'],
    undefined
  >
  readonly displayName: string
}
