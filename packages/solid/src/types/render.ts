import type { ChildrenEvaluator } from '@polymorphic-ui/core'
import type { FilterPredicate, ResolvedProps } from './primitives'
import type { KnownProps } from './props'
import type { Runtime } from './runtime'
import type { SlotValidator } from '../slot/slot-validator'

export type ResolvedRenderState = Readonly<{
  tag: import('@polymorphic-ui/core').ElementType
  children?: unknown
  class: string
  props: ResolvedProps
}>

export type RenderInput<TProps extends KnownProps = KnownProps> = Readonly<{
  runtime: Runtime
  props: TProps
  filterProps: FilterPredicate
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
}>
