import type { NodeId } from './pipeline-compat'
import type { NodeDecoration, RenderContext } from './types'

export function buildRenderContext(decoration: Record<NodeId, NodeDecoration> = {}): RenderContext {
  return { decoration: new Map(Object.entries(decoration)) }
}
