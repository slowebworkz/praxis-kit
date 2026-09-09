import type { Backend, ComponentDefinition, RenderContext, TreeContext } from './types'

export function renderComponent<TOutput>(
  definition: ComponentDefinition,
  tree: TreeContext,
  render: RenderContext,
  backend: Backend<TOutput>,
): TOutput {
  return backend.render({ definition, tree, render })
}
