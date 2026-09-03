export type * from './types'
export type { NodeId, SlotName } from './pipeline-compat'
export { componentMergeStrategy } from './merge-context'
export { isCompleteIdentity, resolveDefinition } from './resolve-definition'
export { applyAttributes } from './apply-attributes'
export { getActiveProps } from './get-active-props'
export { renderComponent } from './render-component'
export { buildTreeContext } from './build-tree-context'
export { buildRenderContext } from './build-render-context'

// The `./compiler` entry (`compileComponent` + passes) is NOT ported yet: `../pk`'s compiler is
// built on the pre-rewrite `@praxis-kit/pipeline` (`createPipeline` / `executePipeline` with a
// pluggable `merge` + `plugins`), which the rewritten `lib/pipeline` replaced with `runPipeline`
// + a fixed `mergeContext`. It needs a rewrite against the new model and lands with `plugins/vite`
// (its only consumer). See DECISIONS.md / .vscode/MIGRATION.md.
