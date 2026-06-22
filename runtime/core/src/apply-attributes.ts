import type { NodeId } from '@pk2/foundation'
import type { AttributeMap, NodeDecoration } from './types'

export function applyAttributes(
  nodeId: NodeId,
  incoming: AttributeMap,
  decoration: Record<NodeId, NodeDecoration>,
  removedKeys?: ReadonlySet<string>,
): Record<NodeId, NodeDecoration> {
  const existing = decoration[nodeId] ?? {}
  const next: AttributeMap = { ...existing.attributes }

  if (removedKeys !== undefined) {
    for (const key of removedKeys) {
      delete next[key]
    }
  }

  Object.assign(next, incoming)

  const { attributes: _dropped, ...rest } = existing
  const nextDecoration: NodeDecoration =
    Object.keys(next).length > 0 ? { ...rest, attributes: next } : rest

  return { ...decoration, [nodeId]: nextDecoration }
}
