// Styling runtime layer — variant composition, class pipeline, plugin API.
// Includes everything from the primitive entry.
export * from './primitive'
export { createClassPipeline, diagnoseClassPipeline } from '@praxis-ui/styling'
export type { ClassDiagnosis, CompoundTrace } from '@praxis-ui/styling'
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
