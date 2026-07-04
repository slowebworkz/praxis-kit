import type { NodeId } from '@praxis-kit/pipeline'
import type { AnyRecord } from '@praxis-kit/primitive'

export type Listener = (...args: unknown[]) => void

export type AttributeValue = string | number | boolean
export type StyleValue = string | number

export type AttributeMap = Record<string, AttributeValue>
export type StyleMap = Record<string, StyleValue>
export type ListenerMap = Record<string, Listener>
export type VariantMap = AnyRecord

export interface NodeDecoration {
  attributes?: AttributeMap
  styles?: StyleMap
  listeners?: ListenerMap
  variants?: VariantMap
  ref?: unknown
}

export type DecorationMap = ReadonlyMap<NodeId, NodeDecoration>
