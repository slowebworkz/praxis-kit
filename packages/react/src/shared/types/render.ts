import type { ChildrenEvaluator, ElementType } from '@polymorphic-ui/core'
import type { ReactElement, Ref } from 'react'
import type { SlotValidator } from '../slot/slot-validator'
import type { FilterPredicate, NormalizeChildren, ResolvedProps, SlotComponent } from './primitives'
import type { AsProp, AsChildProp, KnownProps } from './props'
import type { Runtime } from './runtime'

export type RenderDirectives = Readonly<AsProp & AsChildProp>

export type ResolvedRenderState = Readonly<{
  tag: ElementType
  directives: RenderDirectives
  children?: unknown
  className: string
  props: ResolvedProps
}>

export type ResolvedSlotRender = Readonly<{
  child: ReactElement | ReactElement[]
}>

export type RenderInput<TProps extends KnownProps = KnownProps> = Readonly<{
  runtime: Runtime
  props: TProps
  ref: Ref<unknown> | null
  slotComponent: SlotComponent
  normalizeChildren: NormalizeChildren
  filterProps: FilterPredicate
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
}>
