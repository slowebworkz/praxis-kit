import { buildEngines, composeFilter, resolveAdapterCommonOptions } from '@praxis-kit/adapter-utils'
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
import { buildCoreRuntime } from './build-core-runtime'
import { normalizeChildren } from './normalize-children'
import type { PreactFactoryOptions } from './preact-options'
import { Slot, SlotValidator } from './slot'
import type { BuiltRuntime, NormalizedOptions, UnknownProps } from './types'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: PreactFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
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
  options: PreactFactoryOptions<TDefault, Props, Variants, TPreset>,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>

  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)

  const { diagnostics, enforcement, filterProps: userFilter, name, slotComponent } = normalized

  const { childrenEvaluator } = buildEngines(diagnostics, enforcement?.children, name)
  const filterProps = composeFilter(ownedKeys, userFilter)
  const slotValidator = new SlotValidator(name, diagnostics, 'Preact element')

  const built: BuiltRuntime<G> = {
    runtime,
    filterProps,
    slotValidator,
    slotComponent,
    normalizeChildren,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  }

  return built
}
