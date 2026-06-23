import type { Ref } from 'react'
import type { NodeId } from '@pk2/foundation'
import type { NodeDecoration } from '@pk2/core'

export function applyRef(
  decoration: Record<NodeId, NodeDecoration>,
  ref: Ref<unknown> | undefined,
): Record<NodeId, NodeDecoration> {
  if (ref == null) return decoration
  const existing = decoration['root'] ?? {}
  return { ...decoration, root: { ...existing, ref } }
}
