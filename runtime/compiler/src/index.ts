export { compileComponent } from './compile-component'
export { variantLookupPass } from './variant-lookup-pass'
export {
  capabilityMerge,
  compilerMergeStrategy,
  diagnosticMerge,
  identityMerge,
  metadataMerge,
  slotMerge,
  variantMerge,
} from './compiler-merge-strategy'
export {
  contributeCapabilities,
  contributeMetadata,
  contributeSlots,
  contributeVariants,
} from './passes'
export { variantProvider, type VariantProviderOptions } from './variant-provider'
export type {
  ArtifactHashes,
  ArtifactMetadata,
  ArtifactPrecomputed,
  CompiledComponentArtifact,
  CompilerContext,
  SourceLocation,
} from './types'
