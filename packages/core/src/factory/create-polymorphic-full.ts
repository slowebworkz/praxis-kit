import { AriaPolicyEngine } from '@praxis-kit/contract'
import { createClassPipeline } from '@praxis-kit/styling'
import { createPolymorphic as _createPolymorphic } from './create-polymorphic'
import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PluginInstance,
  PolymorphicRuntime,
  RecipeMap,
  VariantMap,
} from '../types'
import { HTML_ARIA_RULES, getHtmlPropNormalizers } from '../html'

const FULL_CAPABILITIES = {
  createClassPipeline,
  AriaEngine: AriaPolicyEngine,
  htmlAriaRules: HTML_ARIA_RULES,
  htmlPropNormalizersFn: getHtmlPropNormalizers,
}

export function createPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> = {},
): PolymorphicRuntime<
  TDefault,
  Props,
  Variants,
  Extract<keyof TPreset, string>,
  TPreset,
  PluginInstance<TPlugin>
> {
  return _createPolymorphic(options, FULL_CAPABILITIES)
}
