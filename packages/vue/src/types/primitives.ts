import type { VNode } from 'vue'

export type UnknownProps = Record<string, unknown>
export type VariantKey = string
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-ui/adapter-utils'
export type NormalizeChildren = () => VNode[]
