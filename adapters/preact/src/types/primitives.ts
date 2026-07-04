import type { ComponentType, VNode } from 'preact'
import type { AnyRecord } from '@praxis-kit/primitive'

export type UnknownProps = AnyRecord
export type SlotComponent = ComponentType<UnknownProps>
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-kit/adapter-utils'

// Preact's VNode<P> is invariant in P — no non-any wildcard exists for a generic VNode.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyVNode = VNode<any>

export type NormalizeChildren = (children: unknown) => AnyVNode[]
