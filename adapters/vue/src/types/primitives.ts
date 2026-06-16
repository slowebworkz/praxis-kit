import type { VNode } from 'vue'

export type UnknownProps = Record<string, unknown>
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-kit/adapter-utils'
export type NormalizeChildren = () => VNode[]
