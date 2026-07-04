import type { ComponentType, ReactElement } from 'react'
import type { AnyRecord } from '@praxis-kit/primitive'

export type UnknownProps = AnyRecord
export type SlotComponent = ComponentType<UnknownProps>
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-kit/adapter-utils'
export type NormalizeChildren = (children: unknown) => ReactElement[]
