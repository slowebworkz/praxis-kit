import type { ComponentType, VNode } from 'preact'

export type UnknownProps = Record<string, unknown>
export type SlotComponent = ComponentType<UnknownProps>
export type VariantKey = string
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@polymorphic-ui/adapter-utils'

// Preact's VNode<P> is invariant in P — no non-any wildcard exists for a generic VNode.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyVNode = VNode<any>

export type NormalizeChildren = (children: unknown) => AnyVNode[]
