import type { ComponentType, ReactElement } from 'react'

export type UnknownProps = Record<string, unknown>
export type SlotComponent = ComponentType<UnknownProps>
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-ui/adapter-utils'
export type NormalizeChildren = (children: unknown) => ReactElement[]
