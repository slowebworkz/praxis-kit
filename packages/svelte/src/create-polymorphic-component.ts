import type {
  AnyRecord,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import { buildRuntime } from './build-runtime'
import type { SvelteFactoryOptions } from './svelte-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { UnknownProps } from './types'

// Unlike the React/Solid/Preact adapters, createPolymorphicComponent in Svelte
// returns a BuiltRuntime bundle rather than a component function. Svelte
// components must come from .svelte files (compile-time constraint); the bundle
// is passed as the `bundle` prop to <Polymorphic> from Polymorphic.svelte.
export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
  TPluginProps extends AnyRecord = Record<never, never>,
  TOptions extends WithChildRules = SvelteFactoryOptions<
    TDefault,
    Props & TPluginProps,
    Variants,
    TPreset
  >,
>(
  options: SvelteFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & TOptions,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>, TOptions> {
  return buildRuntime(
    options as SvelteFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
  ) as unknown as BuiltRuntime<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>,
    TOptions
  >
}
