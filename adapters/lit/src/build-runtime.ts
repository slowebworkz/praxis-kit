import type { ElementType, RecipeMap, VariantMap } from '@praxis-kit/core'
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
} from '@praxis-kit/adapter-utils'
import type { BuiltRuntime, NormalizedOptions, RuntimeG } from './types/index'
import type { LitFactoryOptions } from './types/index'

function normalizeOptions<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
>(
  options: LitFactoryOptions<TDefault, Props, Variants, TPreset>,
): NormalizedOptions<RuntimeG<TDefault, Props, Variants, TPreset>> {
  return {
    ...options,
    ...resolveAdapterCommonOptions(options, 'PolymorphicElement', false),
  } as NormalizedOptions<RuntimeG<TDefault, Props, Variants, TPreset>>
}

export function buildRuntime<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
>(
  options: LitFactoryOptions<TDefault, Props, Variants, TPreset>,
): BuiltRuntime<RuntimeG<TDefault, Props, Variants, TPreset>> {
  type G = RuntimeG<TDefault, Props, Variants, TPreset>

  const { filterProps: customFilter, enforcement } = options
  const normalized = normalizeOptions(options)

  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { childrenEvaluator } = buildEngines(
    normalized.strict,
    enforcement?.children,
    normalized.name,
  )
  const filterProps = composeFilter(ownedKeys, customFilter)

  return {
    runtime,
    filterProps,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  }
}
