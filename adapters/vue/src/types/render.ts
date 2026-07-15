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
  // Pre-filter props (post prop-normalization, before applyFilter/variantKeys
  // stripping) — exposed for childrenEvaluator's dynamic(...) rule context, which
  // needs the full normalized view, not the DOM-bound subset in `props`.
  normalizedProps: ResolvedProps
}>

export type RenderInput = Readonly<{
  runtime: Runtime
  state: ResolvedRenderState
  slots: Slots
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
}>
