import type { ComponentType, ReactElement } from 'react'

export type UnknownProps = Record<string, unknown>
export type SlotComponent = ComponentType<UnknownProps>
export type VariantKey = string
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@polymorphic-ui/adapter-utils'
export type NormalizeChildren = (children: unknown) => ReactElement[]
