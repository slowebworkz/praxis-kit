import type { NodeId } from '@praxis-kit/pipeline'
import type { NodeDecoration, RenderContext } from './types'

export function buildRenderContext(decoration: Record<NodeId, NodeDecoration> = {}): RenderContext {
  return { decoration: new Map(Object.entries(decoration)) }
}
