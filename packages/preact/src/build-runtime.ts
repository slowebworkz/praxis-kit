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
import { buildCoreRuntime, buildEngines, composeFilter } from '@praxis-ui/adapter-utils'
import { normalizeChildren } from './normalize-children'
import type { PreactFactoryOptions } from './preact-options'
import { Slot, SlotValidator } from './slot'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions } from './types/normalized-options'
import type { SlotComponent, UnknownProps } from './types'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: PreactFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
): NormalizedOptions<G> {
  return {
    ...options,
    slotComponent: options.slotComponent ?? (Slot as SlotComponent),
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
  options: PreactFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>, TOptions> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const slotValidator = new SlotValidator(normalized.name, normalized.strict)
  const { childrenEvaluator } = buildEngines(
    normalized.strict,
    normalized.enforcement?.children,
    normalized.name,
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)

  return {
    runtime,
    slotComponent: normalized.slotComponent,
    normalizeChildren,
    slotValidator,
    filterProps,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  } as BuiltRuntime<G, TOptions>
}
