import { AriaPolicyEngine } from '@praxis-ui/contract'
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

// ARIA engine only — no class pipeline. Tree-shakes lib/styling/src for enforcement-only consumers.
const CONTRACTED_CAPABILITIES = { AriaEngine: AriaPolicyEngine }

export function createContractedPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset> = {},
): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset> {
  return _createPolymorphic(options, CONTRACTED_CAPABILITIES)
}
