import type { ComponentType, ReactElement } from 'react'

export type UnknownProps = Record<string, unknown>
export type SlotComponent = ComponentType<UnknownProps>
export type VariantKey = string
export type ResolvedProps = Readonly<UnknownProps>
export type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean
export type NormalizeChildren = (children: unknown) => ReactElement[]
