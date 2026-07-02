import type { NodeId } from '@praxis-kit/pipeline'
import type { NodeDecoration } from '@praxis-kit/runtime'

export function applyRef(
  decoration: Record<NodeId, NodeDecoration>,
  ref: unknown,
): Record<NodeId, NodeDecoration> {
  if (ref == null) return decoration
  const existing = decoration['root'] ?? {}
  return { ...decoration, root: { ...existing, ref } }
}
