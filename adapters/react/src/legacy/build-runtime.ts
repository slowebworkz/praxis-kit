import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
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
import type { BuiltRuntime, NormalizedOptions, ReactFactoryOptions, UnknownProps } from '../shared'
import { SlotValidator } from '../shared'
import { normalizeChildren } from './normalize-children'
import { Slot } from './slot'

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
