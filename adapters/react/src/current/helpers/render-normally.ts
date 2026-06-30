import { cloneElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { NodeId } from '@pk2/pipeline'
import type { ComponentDefinition, NodeDecoration } from '@pk2/core'
import { buildRenderContext, buildTreeContext, renderComponent } from '@pk2/core'
import { reactBackend } from '@pk2/react'

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
