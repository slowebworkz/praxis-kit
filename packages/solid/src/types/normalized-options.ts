import type {
  DefaultOf,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@praxis-kit/core'
import type { SolidFactoryOptions } from '../solid-options'

export type NormalizedOptions<G extends PolymorphicGenerics> = SolidFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  PresetOf<G>
> & {
  readonly name: string
  readonly strict: Exclude<StrictMode, undefined>
}
