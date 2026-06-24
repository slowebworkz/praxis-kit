import { cloneElement } from 'preact'
import type { NodeId } from '@pk2/foundation'
import type { ComponentDefinition, NodeDecoration } from '@pk2/core'
import { buildRenderContext, buildTreeContext, renderComponent } from '@pk2/core'
import { preactBackend } from '@pk2/preact'
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
