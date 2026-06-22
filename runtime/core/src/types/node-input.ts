import type { NodeId, SlotName } from '@pk2/foundation'

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
