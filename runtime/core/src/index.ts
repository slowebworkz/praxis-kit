export type * from './types'
export { componentMergeStrategy } from './merge-context'
export { isCompleteIdentity, resolveDefinition } from './resolve-definition'
export { applyAttributes } from './apply-attributes'
export { getActiveProps } from './get-active-props'
export { renderComponent } from './render-component'
export { buildTreeContext } from './build-tree-context'
export { buildRenderContext } from './build-render-context'

// Compiler exports (compile-component.ts imports node:crypto, unsafe for
// browser bundles) live in a separate entry — see ./compiler/index.ts.
