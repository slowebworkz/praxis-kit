import type { NodeId } from '@praxis-kit/pipeline'
import type { AttributeMap, NodeDecoration } from './types'
import { iterate } from '@praxis-kit/primitive'

export function applyAttributes(
  nodeId: NodeId,
  incoming: AttributeMap,
  decoration: Record<NodeId, NodeDecoration>,
  removedKeys?: ReadonlySet<string>,
): Record<NodeId, NodeDecoration> {
  const existing = decoration[nodeId] ?? {}
  const next: AttributeMap = { ...existing.attributes }

  if (removedKeys !== undefined) {
    iterate.forEachSet(removedKeys, (key) => {
      delete next[key]
    })
  }

  Object.assign(next, incoming)

  const { attributes: _dropped, ...rest } = existing
  const nextDecoration: NodeDecoration =
    Object.keys(next).length > 0 ? { ...rest, attributes: next } : rest

  return { ...decoration, [nodeId]: nextDecoration }
}
