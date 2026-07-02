import { cloneElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { NodeId } from '@praxis-kit/pipeline'
import type { ComponentDefinition, NodeDecoration } from '@praxis-kit/runtime'
import { buildRenderContext, buildTreeContext, renderComponent } from '@praxis-kit/runtime'
import { reactBackend } from '../../backend/react-backend'

export function renderNormally(
  definition: ComponentDefinition,
  tag: string,
  decoration: Record<NodeId, NodeDecoration>,
  children?: ReactNode,
): ReactElement {
  const treeCtx = buildTreeContext({ kind: 'native', tag, id: 'root', children: [] })
  const rendered = renderComponent(
    definition,
    treeCtx,
    buildRenderContext(decoration),
    reactBackend,
  )
  return children === undefined ? rendered : cloneElement(rendered, {}, children)
}
