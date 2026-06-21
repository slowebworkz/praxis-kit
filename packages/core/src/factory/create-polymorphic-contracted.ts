import { AriaPolicyEngine } from '@praxis-kit/contract'
import { createPolymorphic as _createPolymorphic } from './create-polymorphic'
import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PluginInstance,
  PolymorphicRuntime,
  RecipeMap,
  VariantMap,
} from '../types'
import { HTML_ARIA_RULES } from '../html/aria-rules'
import { getHtmlPropNormalizers } from '../html/prop-normalizers'

// ARIA engine only — no class pipeline. Tree-shakes lib/styling/src for enforcement-only consumers.
const CONTRACTED_CAPABILITIES = {
  AriaEngine: AriaPolicyEngine,
  htmlAriaRules: HTML_ARIA_RULES,
  htmlPropNormalizersFn: getHtmlPropNormalizers,
}

export function createContractedPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
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
  return _createPolymorphic(options, CONTRACTED_CAPABILITIES)
}
