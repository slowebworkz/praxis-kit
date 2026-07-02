import type { Diagnostic, NodeId, SlotName } from '@praxis-kit/pipeline'
import type { TreeNode } from './tree-node'

export interface TreeContext {
  root: TreeNode
  slotAssignments: ReadonlyMap<NodeId, SlotName>
  diagnostics: Diagnostic[]
}
