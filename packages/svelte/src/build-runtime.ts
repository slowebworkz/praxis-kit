import type {
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  PresetOf,
  PropsOf,
  VariantMap,
  VariantsOf,
} from '@praxis-ui/core'
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  SlotValidator,
} from '@praxis-ui/adapter-utils'
import type { SvelteFactoryOptions } from './svelte-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions } from './types/normalized-options'
import type { UnknownProps } from './types'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: SvelteFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
): NormalizedOptions<G> {
  return {
    ...options,
    name: options.name ?? 'PolymorphicComponent',
    strict: options.enforcement?.strict ?? 'throw',
  } as NormalizedOptions<G>
}

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
  TOptions extends WithChildRules,
>(
  options: SvelteFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>, TOptions> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { childrenEvaluator } = buildEngines(normalized.strict, normalized.enforcement?.children)
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)
  const slotValidator = new SlotValidator(normalized.name, normalized.strict, 'Snippet')

  return {
    runtime,
    filterProps,
    slotValidator,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  } as BuiltRuntime<G, TOptions>
}
