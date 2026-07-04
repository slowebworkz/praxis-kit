import type { AriaPolicyEngine } from '@praxis-kit/core/contract'
import type { NodeId } from '@praxis-kit/pipeline'
import type { AnyRecord } from '@praxis-kit/primitive'
import type { NodeDecoration } from '@praxis-kit/runtime'
import { withAttributes } from './decoration-utils'

export function applyAria(
  decoration: Record<NodeId, NodeDecoration>,
  tag: string,
  ariaEngine?: AriaPolicyEngine,
): Record<NodeId, NodeDecoration> {
  if (ariaEngine === undefined) return decoration
  const dec = decoration['root']
  if (dec?.attributes === undefined) return decoration
  const result = ariaEngine.validate(tag, dec.attributes as AnyRecord)
  const cleaned = result.props as typeof dec.attributes
  return {
    ...decoration,
    root: withAttributes(dec, Object.keys(cleaned).length > 0 ? cleaned : undefined),
  }
}
