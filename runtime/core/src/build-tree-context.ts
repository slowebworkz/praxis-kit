import type { Diagnostic, NodeId, SlotName } from '@pk2/pipeline'
import type { NodeInput, TreeContext, TreeNode } from './types'

function buildNode(
  input: NodeInput,
  slotAssignments: Map<NodeId, SlotName>,
  seenIds: Set<NodeId>,
  diagnostics: Diagnostic[],
): TreeNode {
  if (seenIds.has(input.id)) {
    diagnostics.push({
      code: 'duplicate-node-id',
      message: `Duplicate node id "${input.id}"`,
      severity: 'error',
    })
  } else {
    seenIds.add(input.id)
  }

  if (input.slot !== undefined) {
    slotAssignments.set(input.id, input.slot)
  }

  const children = Object.freeze(
    (input.children ?? []).map((child) => buildNode(child, slotAssignments, seenIds, diagnostics)),
  )

  if (input.kind === 'native') {
    return Object.freeze({ kind: 'native', id: input.id, tag: input.tag, children })
  }

  return Object.freeze({ kind: 'component', id: input.id, children })
}

export function buildTreeContext(root: NodeInput): TreeContext {
  const slotAssignments = new Map<NodeId, SlotName>()
  const diagnostics: Diagnostic[] = []
  const rootNode = buildNode(root, slotAssignments, new Set(), diagnostics)
  return Object.freeze({ root: rootNode, slotAssignments, diagnostics })
}
