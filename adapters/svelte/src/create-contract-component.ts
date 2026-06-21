import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { buildRuntime } from './build-runtime'
import type { SvelteFactoryOptions } from './svelte-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { UnknownProps } from './types'

// Unlike the React/Solid/Preact adapters, createContractComponent in Svelte
// returns a BuiltRuntime bundle rather than a component function. Svelte
// components must come from .svelte files (compile-time constraint); the bundle
// is passed as the `bundle` prop to <Polymorphic> from Polymorphic.svelte.
export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
  TOptions extends WithChildRules = SvelteFactoryOptions<
    TDefault,
    Props & ExtractPluginProps<TPlugin>,
    Variants,
    TPreset
  >,
>(
  options: SvelteFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & TOptions,
): BuiltRuntime<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>,
  TOptions
> {
  return buildRuntime(
    options as SvelteFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
  ) as unknown as BuiltRuntime<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>,
    TOptions
  >
}
