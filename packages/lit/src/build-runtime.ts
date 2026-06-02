import type { ElementType, PresetMap, StrictMode, VariantMap } from '@praxis-ui/core'
import { buildCoreRuntime, buildEngines, composeFilter } from '@praxis-ui/adapter-utils'
import type { BuiltRuntime, NormalizedOptions, RuntimeG } from './types/index'
import type { LitFactoryOptions } from './types/index'

function normalizeOptions<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
>(
  options: LitFactoryOptions<TDefault, Props, Variants, TPreset>,
): NormalizedOptions<RuntimeG<TDefault, Props, Variants, TPreset>> {
  // The spreaded fields retain their generic types; name and strict are widened
  // to their required forms. The cast is unavoidable here because TypeScript
  // cannot prove that spreading `options` followed by literal overrides produces
  // the exact NormalizedOptions intersection — the required `name: string` and
  // `strict: StrictMode` fields narrow the inferred spread type.
  const name = options.name ?? 'PolymorphicElement'
  const strict: Exclude<StrictMode, undefined> = options.enforcement?.strict ?? false
  return { ...options, name, strict } as NormalizedOptions<
    RuntimeG<TDefault, Props, Variants, TPreset>
  >
}

export function buildRuntime<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
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
