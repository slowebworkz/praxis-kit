import type {
  DefaultOf,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@praxis-ui/core'
import type { VueFactoryOptions } from '../vue-options'

export type NormalizedOptions<G extends PolymorphicGenerics> = VueFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  PresetOf<G>
> & {
  readonly name: string
  readonly strict: Exclude<StrictMode, undefined>
}
