import type { ElementType, RecipeMap, VariantMap } from '@praxis-kit/core'
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
} from '@praxis-kit/adapter-utils'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { BuiltRuntime, NormalizedOptions, RuntimeG } from './types/index'
import type { WebFactoryOptions } from './types/index'

export function buildRuntime<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
>(
  options: WebFactoryOptions<TDefault, Props, Variants, TPreset>,
): BuiltRuntime<RuntimeG<TDefault, Props, Variants, TPreset>> {
  type G = RuntimeG<TDefault, Props, Variants, TPreset>

  const normalized = {
    ...options,
    ...resolveAdapterCommonOptions(options, 'PolymorphicElement', silentDiagnostics),
  } as NormalizedOptions<G>

  const { filterProps: customFilter, enforcement } = normalized
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { childrenEvaluator } = buildEngines(
    normalized.diagnostics,
    enforcement?.children,
    normalized.name,
  )
  const filterProps = composeFilter(ownedKeys, customFilter)

  return {
    runtime,
    filterProps,
    diagnostics: normalized.diagnostics,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  }
}
