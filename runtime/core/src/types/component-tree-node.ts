import type { NodeId } from '@pk2/foundation'
import type { TreeNode } from './tree-node'

export interface ComponentTreeNode {
  kind: 'component'
  id: NodeId
  children: ReadonlyArray<TreeNode>
}
