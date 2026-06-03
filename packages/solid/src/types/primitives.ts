import type { JSX } from 'solid-js'

export type UnknownProps = Record<string, unknown>
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-ui/adapter-utils'
export type SolidElement = JSX.Element
export type SlotRenderFn = (props: UnknownProps) => SolidElement
