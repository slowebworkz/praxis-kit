import type { Ref } from 'preact'
import type { AnyVNode, UnknownProps } from '../types/primitives'

export type EventHandler<Args extends unknown[] = unknown[]> = (...args: Args) => void

export type MergePolicyHandler = (slotVal: unknown, childVal: unknown) => unknown

export type SlotProps = UnknownProps & {
  children?: unknown
}

export type CloneSlotChildFn = (args: {
  child: AnyVNode
  slotProps: UnknownProps
  ref: Ref<unknown> | null
}) => AnyVNode
