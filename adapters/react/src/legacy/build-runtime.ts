import type { ElementType, PolymorphicGenerics, RecipeMap, VariantMap } from '@praxis-kit/core'
import type { BuiltRuntime, ReactFactoryOptions, UnknownProps } from '../shared'
import { buildRuntime as buildRuntimeShared } from '../shared'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>> {
  return buildRuntimeShared(options, Slot, normalizeChildren)
}
