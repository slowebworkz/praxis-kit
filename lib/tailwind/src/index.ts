export { createTailwindPipeline } from './create-tailwind-pipeline'
export { layoutKeys } from './layout-keys'
// The layout-shorthand prop types a component gains when it uses `createTailwindPipeline` — for
// typing a wrapper around such a component. `LayoutProps<typeof layoutKeys>` is the shape;
// `LayoutKeyName` is the bare union of key names, for an adapter collapsing that union back out
// of an extracted prop type.
export type { LayoutKeyName } from './layout-keys'
export type { LayoutProps, LayoutKey, ResolvedLayout } from './types/layout'

// Internal — the classifier / dependency-evaluator / builder / layout-state classes and the
// `*Token` / pipeline-context types are implementation detail of `createTailwindPipeline`, not a
// consumer surface. Import them from their own files if you're extending the pipeline in-tree.
// Do not re-add `export type * from './types'` or the class exports here.
