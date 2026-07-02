import { cloneElement } from 'preact'
import type { NodeId } from '@praxis-kit/pipeline'
import type { ComponentDefinition, NodeDecoration } from '@praxis-kit/runtime'
import { buildRenderContext, buildTreeContext, renderComponent } from '@praxis-kit/runtime'
import { preactBackend } from '../backend/preact-backend'
import type { AnyVNode } from '../types'

export function renderNormally(
  definition: ComponentDefinition,
  tag: string,
  decoration: Record<NodeId, NodeDecoration>,
  children?: unknown,
): AnyVNode {
  const treeCtx = buildTreeContext({ kind: 'native', tag, id: 'root', children: [] })
  const rendered = renderComponent(
    definition,
    treeCtx,
    buildRenderContext(decoration),
    preactBackend,
  )
  return children === undefined ? rendered : cloneElement(rendered, {}, children)
}
