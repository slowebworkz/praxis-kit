import type { NodeId } from '@pk2/foundation'

export type Listener = (...args: unknown[]) => void

export type AttributeMap = Record<string, string>
export type StyleMap = Record<string, string>
export type ListenerMap = Record<string, Listener>
export type VariantMap = Record<string, unknown>

export interface NodeDecoration {
  attributes?: AttributeMap
  styles?: StyleMap
  listeners?: ListenerMap
  variants?: VariantMap
  ref?: unknown
}

export type DecorationMap = ReadonlyMap<NodeId, NodeDecoration>
