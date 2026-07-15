import type { ChildrenEvaluator, ElementType } from '@praxis-kit/core'
import type { Ref } from 'preact'
import type { SlotValidator } from '../slot'
import type {
  AnyVNode,
  FilterPredicate,
  NormalizeChildren,
  ResolvedProps,
  SlotComponent,
} from './primitives'
import type { AsProp, AsChildProp, KnownProps } from './props'
import type { Runtime } from './runtime'

export type RenderDirectives = Readonly<AsProp & AsChildProp>

export type ResolvedRenderState = Readonly<{
  tag: ElementType
  directives: RenderDirectives
  children?: unknown
  className: string
  props: ResolvedProps
  // Pre-filter props (post prop-normalization, before applyFilter/variantKeys
  // stripping) — exposed for childrenEvaluator's dynamic(...) rule context, which
  // needs the full normalized view, not the DOM-bound subset in `props`.
  normalizedProps: ResolvedProps
}>

export type ResolvedSlotRender = Readonly<{
  child: AnyVNode | AnyVNode[]
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
