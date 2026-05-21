import type { VNode } from 'vue'

export type UnknownProps = Record<string, unknown>
export type VariantKey = string
export type ResolvedProps = Readonly<UnknownProps>
export type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean
export type NormalizeChildren = () => VNode[]
