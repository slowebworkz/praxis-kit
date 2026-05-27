import type {
  ChildRuleInput,
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantMap,
  VariantsOf,
} from '@praxis-ui/core'
import { buildCoreRuntime, buildEngines, composeFilter } from '@praxis-ui/adapter-utils'
import { SlotValidator } from './slot'
import type { VueFactoryOptions } from './vue-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions, UnknownProps } from './types'

/* -------------------------------------------------------------------------------------------------
 * Layer 1 — Normalize options
 * -----------------------------------------------------------------------------------------------*/

function normalizeOptions<G extends PolymorphicGenerics>(
  options: VueFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
): NormalizedOptions<G> {
  return {
    ...options,
    name: options.name ?? 'PolymorphicComponent',
    strict: options.enforcement?.strict ?? 'throw',
  } as NormalizedOptions<G>
}

/* -------------------------------------------------------------------------------------------------
 * Layer 2 — Build validators
 * -----------------------------------------------------------------------------------------------*/

function buildValidators(name: string, strict: StrictMode, childRules?: readonly ChildRuleInput[]) {
  const slotValidator = new SlotValidator(name, strict)
  const { childrenEvaluator } = buildEngines(strict, childRules, name)
  return { slotValidator, childrenEvaluator }
}

/* -------------------------------------------------------------------------------------------------
 * Public entry point
 * -----------------------------------------------------------------------------------------------*/

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
  TOptions extends WithChildRules,
>(
  options: VueFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>, TOptions> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { slotValidator, childrenEvaluator } = buildValidators(
    normalized.name,
    normalized.strict,
    normalized.enforcement?.children,
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)

  return {
    runtime,
    slotValidator,
    filterProps,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  } as BuiltRuntime<G, TOptions>
}
