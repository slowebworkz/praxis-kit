import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
  SlotValidator,
} from '@praxis-kit/adapter-utils'
import type {
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  PropsOf,
  RecipeMap,
  RecipeOf,
  VariantMap,
  VariantsOf,
} from '@praxis-kit/core'
import type { BuiltRuntime, NormalizedOptions, UnknownProps } from './types'
import type { VueFactoryOptions } from './vue-options'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: VueFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
): NormalizedOptions<G> {
  return {
    ...options,
    ...resolveAdapterCommonOptions(options),
  } as NormalizedOptions<G>
}

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
>(
  options: VueFactoryOptions<TDefault, Props, Variants, TPreset>,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>

  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)

  const { diagnostics, enforcement, filterProps: userFilter, name } = normalized

  const { childrenEvaluator } = buildEngines(diagnostics, enforcement?.children, name)
  const filterProps = composeFilter(ownedKeys, userFilter)
  const slotValidator = new SlotValidator(name, diagnostics, 'VNode')

  const built: BuiltRuntime<G> = {
    runtime,
    filterProps,
    slotValidator,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  }

  return built
}
