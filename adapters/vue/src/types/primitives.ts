import type { VNode } from 'vue'
import type { AnyRecord } from '@praxis-kit/primitive'

export type UnknownProps = AnyRecord
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-kit/adapter-utils'
export type NormalizeChildren = () => VNode[]
