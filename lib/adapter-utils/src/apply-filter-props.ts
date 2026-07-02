import type { NodeId } from '@praxis-kit/pipeline'
import type { NodeDecoration } from '@praxis-kit/runtime'
import type { FilterPredicate } from './types'
import { withAttributes } from './decoration-utils'

export function applyFilterProps(
  decoration: Record<NodeId, NodeDecoration>,
  filterFn: FilterPredicate | undefined,
  variantKeys: ReadonlySet<string>,
): Record<NodeId, NodeDecoration> {
  if (filterFn === undefined) return decoration
  const dec = decoration['root']
  if (dec?.attributes === undefined) return decoration
  const kept = Object.fromEntries(
    Object.entries(dec.attributes).filter(([k]) => !filterFn(k, variantKeys)),
  ) as typeof dec.attributes
  return {
    ...decoration,
    root: withAttributes(dec, Object.keys(kept).length > 0 ? kept : undefined),
  }
}
