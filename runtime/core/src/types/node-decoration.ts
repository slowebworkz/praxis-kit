import type { NodeId } from '@pk2/pipeline'

export type Listener = (...args: unknown[]) => void

export type AttributeValue = string | number | boolean
export type StyleValue = string | number

export type AttributeMap = Record<string, AttributeValue>
export type StyleMap = Record<string, StyleValue>
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
