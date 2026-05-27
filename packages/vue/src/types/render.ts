import type { ChildrenEvaluator, ElementType } from '@polymorphic-ui/core'
import type { Slots } from 'vue'
import type { SlotValidator } from '../slot'
import type { FilterPredicate, ResolvedProps, UnknownProps } from './primitives'
import type { AsProp, AsChildProp } from './props'
import type { Runtime } from './runtime'

export type RenderDirectives = Readonly<AsProp & AsChildProp>

export type ResolvedRenderState = Readonly<{
  tag: ElementType
  directives: RenderDirectives
  className: string
  props: ResolvedProps
}>

export type RenderInput = Readonly<{
  runtime: Runtime
  attrs: Readonly<UnknownProps>
  slots: Slots
  filterProps: FilterPredicate
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
  resolvedState?: ResolvedRenderState
}>
