import type {
  DefaultOf,
  EnforcementOptions,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantsOf,
} from '@polymorphic-ui/core'
import type { SvelteFactoryOptions } from '../svelte-options'

export type NormalizedOptions<G extends PolymorphicGenerics> = SvelteFactoryOptions<
  DefaultOf<G>,
  PropsOf<G>,
  VariantsOf<G>,
  PresetOf<G>
> & {
  readonly name: string
  readonly enforcement: EnforcementOptions & {
    readonly strict: Exclude<StrictMode, undefined>
  }
}
