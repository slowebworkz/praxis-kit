import type { NodeId, SlotName } from '@praxis-kit/pipeline'

interface BaseNodeInput {
  id: NodeId
  slot?: SlotName
  children?: ReadonlyArray<NodeInput>
}

export interface NativeNodeInput extends BaseNodeInput {
  kind: 'native'
  tag: string
}

export interface ComponentNodeInput extends BaseNodeInput {
  kind: 'component'
}

export type NodeInput = NativeNodeInput | ComponentNodeInput
