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
  resolveAdapterCommonOptions,
} from '@praxis-ui/adapter-utils'
import type { ReactElement } from 'react'
import type { ReactFactoryOptions } from './react-options'
import { SlotValidator } from './slot'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions } from './types/normalized-options'
import type { SlotComponent, UnknownProps } from './types'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: ReactFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
  defaultSlot: SlotComponent,
): NormalizedOptions<G> {
  return {
    ...options,
    slotComponent: options.slotComponent ?? defaultSlot,
    ...resolveAdapterCommonOptions(options),
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
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
  defaultSlot: SlotComponent,
  normalizeChildren: (children: unknown) => ReactElement[],
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>, TOptions> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options, defaultSlot)
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
