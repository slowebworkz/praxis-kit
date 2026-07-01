import type { NodeId } from '@praxis-kit/pipeline'
import type { TreeNode } from './tree-node'

export interface NativeTreeNode {
  kind: 'native'
  id: NodeId
  tag: string
  children: ReadonlyArray<TreeNode>
}
