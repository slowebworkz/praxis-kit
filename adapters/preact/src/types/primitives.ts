import type { ComponentType, VNode } from 'preact'
import type { AnyRecord } from '@praxis-kit/primitive'

export type UnknownProps = AnyRecord
export type SlotComponent = ComponentType<UnknownProps>
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-kit/adapter-utils'

// Preact's VNode<P> is invariant in P — no non-any wildcard exists for a generic VNode.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyVNode = VNode<any>

// A child after normalization: an element, or a non-empty text/number node. Text is kept
// (not filtered to elements) because the child evaluators are designed to match it — e.g.
// `labelContract`'s `accessible-name` rule matches a plain string child. The asChild/Slot
// path narrows back to elements itself. Mirrors `@praxis-kit/react`'s `NormalizedChild`.
export type NormalizedChild = AnyVNode | string | number

export type NormalizeChildren = (children: unknown) => NormalizedChild[]
