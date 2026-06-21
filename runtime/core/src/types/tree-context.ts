import type { Diagnostic, NodeId, SlotName } from '@pk2/foundation'
import type { TreeNode } from './tree-node'

export interface TreeContext {
  root: TreeNode
  slotAssignments: ReadonlyMap<NodeId, SlotName>
  diagnostics: Diagnostic[]
}
