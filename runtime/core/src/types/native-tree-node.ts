import type { NodeId } from '@pk2/foundation'
import type { TreeNode } from './tree-node'

export interface NativeTreeNode {
  kind: 'native'
  id: NodeId
  tag: string
  children: ReadonlyArray<TreeNode>
}
