// Styling runtime layer — variant composition, class pipeline, plugin API.
// Includes everything from the primitive entry.
export * from './primitive'
export { createClassPipeline } from '@polymorphic-ui/styling'
export type {
  ClassPipelineFn,
  ClassPipelineOptions,
  ClassPlugin,
  ClassPluginFactory,
  OwnedPropKeys,
  CompoundVariant,
  CVACompounds,
  CVAConfig,
  CVADefaults,
  CVAVariants,
  DefaultVariants,
  NonEmptyArray,
  PresetMap,
  VariantMap,
  VariantProps,
  VariantSelection,
  VariantValue,
} from './types'
