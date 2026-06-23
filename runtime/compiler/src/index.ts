export { compileComponent } from './compile-component'
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
export type {
  ArtifactHashes,
  ArtifactMetadata,
  CompiledComponentArtifact,
  CompilerContext,
  SourceLocation,
} from './types'
