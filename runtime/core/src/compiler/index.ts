// Compiler-only entry, separate from the package's main '.' export.
//
// compile-component.ts imports node:crypto (createHash), so anything that
// re-exports it — even a single named import like `getActiveProps` from the
// main barrel — forces bundlers to parse/bind the whole compiler subtree at
// build time (Rollup resolves references before tree-shaking removes unused
// code), which fails in a browser build since node:crypto has no browser
// polyfill. Consumers that only need render-time helpers (getActiveProps,
// resolveDefinition, renderComponent, etc.) import '@praxis-kit/runtime';
// build-time/Node-only compiler consumers import '@praxis-kit/runtime/compiler'.
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
export { variantProvider } from './variant-provider'
export type { VariantProviderOptions } from './variant-provider'
export type {
  ArtifactHashes,
  ArtifactMetadata,
  ArtifactPrecomputed,
  CompiledComponentArtifact,
  CompilerContext,
  SourceLocation,
} from './types'
