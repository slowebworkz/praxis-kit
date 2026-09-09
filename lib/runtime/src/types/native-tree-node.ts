import type { NodeId } from '../pipeline-compat'
import type { TreeNode } from './tree-node'

export interface NativeTreeNode {
  kind: 'native'
  id: NodeId
  tag: string
  children: ReadonlyArray<TreeNode>
}
