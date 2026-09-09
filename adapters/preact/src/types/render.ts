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

/**
 * Rendering directives extracted from component props.
 *
 * These directives influence how a component is rendered (such as changing the
 * rendered element or delegating rendering to a child) but are not forwarded as
 * DOM attributes.
 */
export type RenderDirectives = Readonly<AsProp & AsChildProp>

/**
 * Intermediate state produced after resolving render directives and normalizing
 * component props.
 *
 * This represents the renderer's working state immediately before the final
 * vnode is created. It contains both the DOM-bound props and the fully
 * normalized prop set used during render-time evaluation.
 */
export type ResolvedRenderState = Readonly<{
  /**
   * The resolved element or component that will ultimately be rendered.
   */
  tag: ElementType

  /**
   * Rendering directives extracted from the original component props.
   */
  directives: RenderDirectives

  /**
   * Children after any runtime normalization or transformation.
   */
  children?: unknown

  /**
   * The resolved className after variant resolution and class composition.
   */
  className: string | undefined

  /**
   * The final prop set that will be forwarded to the rendered element.
   */
  props: ResolvedProps

  /**
   * Props after normalization but before filtering.
   *
   * Used by childrenEvaluator's dynamic(...) rules, which require the complete
   * normalized prop set rather than the DOM-bound subset in `props`.
   */
  normalizedProps: ResolvedProps
}>

/**
 * Result of slot resolution.
 *
 * Slot rendering may produce either a single vnode or a normalized collection
 * of sibling vnodes, depending on the rendered content.
 */
export type ResolvedSlotRender = Readonly<{
  child: AnyVNode | readonly AnyVNode[]
}>

/**
 * Complete input required to perform a single render pass.
 *
 * Bundles the component props together with the runtime services responsible
 * for child normalization, prop filtering, slot validation, and render-time
 * evaluation.
 */
export type RenderInput<TProps extends KnownProps = KnownProps> = Readonly<{
  /**
   * Active runtime implementation responsible for rendering behavior.
   */
  runtime: Runtime

  /**
   * Original component props supplied by the caller.
   */
  props: TProps

  /**
   * Ref to forward to the rendered element or component.
   */
  ref: Ref<unknown> | null

  /**
   * Component responsible for rendering slots.
   */
  slotComponent: SlotComponent

  /**
   * Normalizes arbitrary child values into renderable vnode structures.
   */
  normalizeChildren: NormalizeChildren

  /**
   * Determines which normalized props should be forwarded to the rendered
   * element.
   */
  filterProps: FilterPredicate

  /**
   * Validates slot composition before rendering.
   */
  slotValidator: SlotValidator

  /**
   * Optional evaluator used to enforce child composition rules at runtime.
   */
  childrenEvaluator?: ChildrenEvaluator
}>
