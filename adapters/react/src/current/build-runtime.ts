import type {
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  RecipeMap,
  RecipeOf,
  PropsOf,
  VariantMap,
  VariantsOf,
} from '@praxis-kit/core'
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
} from '@praxis-kit/adapter-utils'
import type { ReactFactoryOptions } from '../shared'
import type { BuiltRuntime, NormalizedOptions, UnknownProps } from '../shared'
import { SlotValidator } from '../shared'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: ReactFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
): NormalizedOptions<G> {
  return {
    ...options,
    ...resolveAdapterCommonOptions(options),
    slotComponent: options.slotComponent ?? Slot,
  } as NormalizedOptions<G>
}

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { childrenEvaluator } = buildEngines(
    normalized.diagnostics,
    normalized.enforcement?.children,
    normalized.name,
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)
  const slotValidator = new SlotValidator(normalized.name, normalized.diagnostics, 'React element')

  return {
    runtime,
    filterProps,
    slotValidator,
    slotComponent: normalized.slotComponent,
    normalizeChildren,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  } as BuiltRuntime<G>
}
