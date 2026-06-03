import type { ElementType, PresetMap, VariantMap } from '@praxis-ui/core'
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
} from '@praxis-ui/adapter-utils'
import type { BuiltRuntime, NormalizedOptions, RuntimeG } from './types/index'
import type { WebFactoryOptions } from './types/index'

export function buildRuntime<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
>(
  options: WebFactoryOptions<TDefault, Props, Variants, TPreset>,
): BuiltRuntime<RuntimeG<TDefault, Props, Variants, TPreset>> {
  type G = RuntimeG<TDefault, Props, Variants, TPreset>

  const normalized = {
    ...options,
    ...resolveAdapterCommonOptions(options, 'PolymorphicElement', false),
  } as NormalizedOptions<G>

  const { filterProps: customFilter, enforcement } = normalized
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
    strict: normalized.strict,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  }
}
