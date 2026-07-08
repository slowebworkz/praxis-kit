import type { ChildrenEvaluator, ElementType } from '@praxis-kit/core'
import type { Slots } from 'vue'
import type { SlotValidator } from '../slot'
import type { ResolvedProps } from './primitives'
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
  state: ResolvedRenderState
  slots: Slots
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
}>
