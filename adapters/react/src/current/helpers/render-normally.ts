import { cloneElement } from 'react'
import type { ReactElement } from 'react'
import type { NodeId } from '@pk2/foundation'
import type { ComponentDefinition, NodeDecoration, TreeContext } from '@pk2/core'
import { buildRenderContext, renderComponent } from '@pk2/core'
import { reactBackend } from '@pk2/react'

export function renderNormally(
  definition: ComponentDefinition,
  treeCtx: TreeContext,
  decoration: Record<NodeId, NodeDecoration>,
  children: unknown,
): ReactElement {
  const rendered = renderComponent(
    definition,
    treeCtx,
    buildRenderContext(decoration),
    reactBackend,
  )
  return children !== undefined ? cloneElement(rendered, {}, children as ReactElement) : rendered
}
