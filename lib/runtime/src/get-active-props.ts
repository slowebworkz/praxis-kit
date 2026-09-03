import type { NodeId } from './pipeline-compat'
import type { NodeDecoration, VariantMap } from './types'

/**
 * The active prop set for a node: its decoration's `attributes` overlaid with its `variants`.
 * On a key collision **`variants` wins** — a variant selection is the live styling state, and
 * variant keys are normally kept out of DOM attributes upstream, so the collision is rare.
 */
export function getActiveProps(
  nodeId: NodeId,
  decoration: Record<NodeId, NodeDecoration>,
): VariantMap {
  const dec = decoration[nodeId]
  return { ...(dec?.attributes ?? {}), ...(dec?.variants ?? {}) }
}
