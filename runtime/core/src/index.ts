export type * from './types'
export { componentMergeStrategy } from './merge-context'
export { isCompleteIdentity, resolveDefinition } from './resolve-definition'
export { applyAttributes } from './apply-attributes'
export { getActiveProps } from './get-active-props'
export { renderComponent } from './render-component'
export { buildTreeContext } from './build-tree-context'
export { buildRenderContext } from './build-render-context'
export { compileComponent } from './compiler/compile-component'
export { variantLookupPass } from './compiler/variant-lookup-pass'
export {
  capabilityMerge,
  compilerMergeStrategy,
  diagnosticMerge,
  identityMerge,
  metadataMerge,
  slotMerge,
  variantMerge,
} from './compiler/compiler-merge-strategy'
export {
  contributeCapabilities,
  contributeMetadata,
  contributeSlots,
  contributeVariants,
} from './compiler/passes'
export { variantProvider } from './compiler/variant-provider'
export type { VariantProviderOptions } from './compiler/variant-provider'
export type {
  ArtifactHashes,
  ArtifactMetadata,
  ArtifactPrecomputed,
  CompiledComponentArtifact,
  CompilerContext,
  SourceLocation,
} from './compiler/types'
