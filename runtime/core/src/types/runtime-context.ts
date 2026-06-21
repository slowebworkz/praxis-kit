import type { ComponentDefinition } from './component-definition'
import type { RenderContext } from './render-context'
import type { TreeContext } from './tree-context'

export interface RuntimeContext {
  readonly definition: ComponentDefinition
  readonly tree: TreeContext
  readonly render: RenderContext
}
