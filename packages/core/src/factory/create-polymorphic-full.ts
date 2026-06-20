import { AriaPolicyEngine } from '@praxis-kit/contract'
import { createClassPipeline } from '@praxis-kit/styling'
import { createPolymorphic as _createPolymorphic } from './create-polymorphic'
import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PolymorphicRuntime,
  RecipeMap,
  VariantMap,
} from '../types'
import { HTML_ARIA_RULES } from '../html/aria-rules'
import { getHtmlPropNormalizers } from '../html/prop-normalizers'

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
>(
  options: FactoryOptions<
    TDefault,
    Props,
    Variants,
    TPreset,
    ClassPluginFactory<AnyRecord> | undefined
  > = {},
): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset> {
  return _createPolymorphic(options, FULL_CAPABILITIES)
}
