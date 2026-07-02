import type { NodeId } from '@praxis-kit/pipeline'
import type { TreeNode } from './tree-node'

export interface ComponentTreeNode {
  kind: 'component'
  id: NodeId
  children: ReadonlyArray<TreeNode>
}
