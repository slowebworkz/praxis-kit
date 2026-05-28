import { AriaPolicyEngine } from '@praxis-ui/contract'
import { createClassPipeline } from '@praxis-ui/styling'
import { createPolymorphic as _createPolymorphic } from './create-polymorphic'
import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PolymorphicRuntime,
  PresetMap,
  VariantMap,
} from '../types'

const FULL_CAPABILITIES = { createClassPipeline, AriaEngine: AriaPolicyEngine }

export function createPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset> = {},
): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset> {
  return _createPolymorphic(options, FULL_CAPABILITIES)
}
