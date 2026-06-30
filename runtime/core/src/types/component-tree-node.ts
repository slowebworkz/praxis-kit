import type { NodeId } from '@pk2/pipeline'
import type { TreeNode } from './tree-node'

export interface ComponentTreeNode {
  kind: 'component'
  id: NodeId
  children: ReadonlyArray<TreeNode>
}
