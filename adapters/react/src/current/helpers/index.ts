export { buildDefinition } from './build-definition'
export {
  buildVariantConfig,
  flattenClassName,
  type CompoundRecord,
  type Defaults,
  type PresetRecord,
  type PresetValues,
  type VariantRecord,
  type VariantTable,
} from './build-variant-config'
export { resolveCompounds } from './resolve-compounds'
export { resolveClasses, type ClassResolution } from './resolve-classes'
export { joinClasses } from './join-classes'
export { withAttributes } from './decoration-utils'
export { applyAria } from './apply-aria'
export { applyFilterProps } from './apply-filter-props'
export { applyRef } from './apply-ref'
export { renderAsChild } from './render-as-child'
export { renderNormally } from './render-normally'
export {
  renderWithCallback,
  type RenderCallback,
  type RenderCallbackProps,
} from './render-with-callback'
