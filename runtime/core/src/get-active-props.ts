import type { NodeId } from '@pk2/foundation'
import type { NodeDecoration, VariantMap } from './types'

export function getActiveProps(
  nodeId: NodeId,
  decoration: Record<NodeId, NodeDecoration>,
): VariantMap {
  const dec = decoration[nodeId]
  return { ...(dec?.attributes ?? {}), ...(dec?.variants ?? {}) }
}
