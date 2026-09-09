import type { NodeId } from '../pipeline-compat'
import type { TreeNode } from './tree-node'

export interface ComponentTreeNode {
  kind: 'component'
  id: NodeId
  children: ReadonlyArray<TreeNode>
}
