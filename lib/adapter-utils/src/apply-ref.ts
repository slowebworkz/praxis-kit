import type { NodeId } from '@pk2/pipeline'
import type { NodeDecoration } from '@pk2/core'

export function applyRef(
  decoration: Record<NodeId, NodeDecoration>,
  ref: unknown,
): Record<NodeId, NodeDecoration> {
  if (ref == null) return decoration
  const existing = decoration['root'] ?? {}
  return { ...decoration, root: { ...existing, ref } }
}
