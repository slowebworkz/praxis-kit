/**
 * Shared Preact rendering pipeline.
 *
 * Props are normalized into a `ResolvedRenderState`, optionally validated in development, then
 * dispatched to one of two render paths: Slot (`asChild`) or intrinsic element.
 */
import { h, isValidElement } from 'preact'
import type { Ref } from 'preact'
import type { Writable } from 'type-fest'
import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
import { applyFilter, resolveNormalizedProps } from '@praxis-kit/adapter-utils'
import type { SlotValidator } from './slot'
import { isSlottableElement } from './slot'
import type {
  SlotComponent,
  Runtime,
  KnownProps,
  NormalizedChild,
  RenderInput,
  ResolvedProps,
  ResolvedSlotRender,
  RenderDirectives,
  ResolvedRenderState,
  FilterPredicate,
  AnyVNode,
} from './types'

declare const process: { env: { NODE_ENV: string } }

function buildRenderState(
  tag: ElementType,
  directives: RenderDirectives,
  props: ResolvedProps,
  normalizedProps: ResolvedProps,
  className: string | undefined,
  children: unknown,
): ResolvedRenderState {
  const state: Writable<ResolvedRenderState> = {
    tag,
    directives,
    props,
    normalizedProps,
    className,
  }
  if (children !== undefined) state.children = children
  return state
}

/**
 * Resolves the component's render state.
 *
 * Applies tag resolution, prop normalization, class resolution, filtering, and render
 * directives, producing the canonical state consumed by every render path.
 */
function prepareRenderState(
  runtime: Runtime,
  props: KnownProps,
  filterProps: FilterPredicate,
): ResolvedRenderState {
  const { as, asChild, children, className, recipe, ...rest } = props
  const tag = runtime.resolveTag(as)
  if (runtime.options.allowedAs !== undefined && as !== undefined) {
    enforceAllowedAs(
      tag,
      runtime.options.allowedAs,
      runtime.options.diagnostics,
      runtime.options.displayName,
    )
  }
  const mergedProps = runtime.resolveProps(rest)
  const normalizedProps = resolveNormalizedProps(runtime.options, tag, mergedProps)
  const resolvedClass = runtime.resolveClasses(tag, normalizedProps, className, recipe)
  const filteredProps = applyFilter(normalizedProps, filterProps, runtime.options.variantKeys)
  const directives: RenderDirectives = {
    ...(as !== undefined && { as }),
    ...(asChild !== undefined && { asChild }),
  }
  return buildRenderState(tag, directives, filteredProps, normalizedProps, resolvedClass, children)
}

/**
 * Warns when the Slot path drops meaningful children it cannot compose onto its single element.
 *
 * Baseline is the *normalized* list (elements + non-empty text/number), not the raw `children`
 * prop — so `{cond && <X/>}`, `null`, `false`, and whitespace-only strings, which Preact arrays
 * but never renders, do not count as discarded. The difference against the element-only Slot
 * list is exactly the text/number siblings Slot will discard. A zero-element list is left to
 * `assertSingleChild`. Mirrors `@praxis-kit/react`.
 */
function warnDiscardedChildren(
  normalizedChildren: readonly NormalizedChild[],
  slotChildren: readonly AnyVNode[],
  validator: SlotValidator,
): void {
  if (slotChildren.length === 0) return
  const discarded = normalizedChildren.length - slotChildren.length
  if (discarded > 0) validator.warnDiscardedChildren(discarded)
}

function isSingleElementArray(arr: AnyVNode[]): arr is [AnyVNode] {
  return arr.length === 1
}

function resolveSlotChildren(
  normalizedChildren: readonly NormalizedChild[],
  slotChildren: AnyVNode[],
  validator: SlotValidator,
): AnyVNode | AnyVNode[] | null {
  warnDiscardedChildren(normalizedChildren, slotChildren, validator)
  if (isSingleElementArray(slotChildren)) {
    return slotChildren[0]
  }
  // Slottable sibling pattern: [element, <Slottable>] — Slot handles the merge internally.
  if (slotChildren.length > 1 && slotChildren.some(isSlottableElement)) {
    return slotChildren
  }
  validator.assertSingleChild(slotChildren.length)
  // Non-throw modes: warned and fell through — render normally as a fallback.
  return null
}

function validateSlotDirectives(directives: RenderDirectives, validator: SlotValidator): boolean {
  const { as, asChild } = directives
  if (!asChild) return false
  if (as !== undefined) {
    validator.assertExclusive()
    // Non-throw modes: warned and fell through — render normally as a fallback.
    return false
  }
  return true
}

function resolveSlotRender(
  state: ResolvedRenderState,
  getNormalizedChildren: () => readonly NormalizedChild[],
  getSlotChildren: () => AnyVNode[],
  validator: SlotValidator,
): ResolvedSlotRender | null {
  if (!validateSlotDirectives(state.directives, validator)) return null
  const child = resolveSlotChildren(getNormalizedChildren(), getSlotChildren(), validator)
  if (child === null) return null
  return { child }
}

function renderResolvedSlot(
  slotComponent: SlotComponent,
  state: ResolvedRenderState,
  slotRender: ResolvedSlotRender,
  ref: Ref<unknown> | null,
): AnyVNode {
  return h(slotComponent, {
    ...state.props,
    className: state.className,
    ref,
    children: slotRender.child,
  })
}

function tryRenderAsChild(
  state: ResolvedRenderState,
  ref: Ref<unknown> | null,
  slotComponent: SlotComponent,
  getNormalizedChildren: () => readonly NormalizedChild[],
  getSlotChildren: () => AnyVNode[],
  validator: SlotValidator,
): AnyVNode | null {
  const slotRender = resolveSlotRender(state, getNormalizedChildren, getSlotChildren, validator)
  if (slotRender === null) return null
  return renderResolvedSlot(slotComponent, state, slotRender, ref)
}

function buildElementProps(
  props: ResolvedProps,
  className: string | undefined,
  ref: Ref<unknown> | null,
  children: unknown,
): IntrinsicProps {
  const { role, ...rest } = props

  return {
    ...rest,
    className,
    ref,
    ...(children !== undefined && { children }),
    ...(isKnownAriaRole(role) && { role }),
  }
}

function renderIntrinsic(
  state: ResolvedRenderState,
  ref: Ref<unknown> | null,
  runtime: Runtime,
): AnyVNode {
  const elementProps = buildElementProps(state.props, state.className, ref, state.children)
  const domProps =
    typeof state.tag === 'string'
      ? runtime.resolveAria(state.tag, elementProps, state.normalizedProps).props
      : elementProps
  return h(state.tag, domProps)
}

export function render<TProps extends KnownProps>({
  runtime,
  props,
  ref,
  slotComponent,
  normalizeChildren,
  filterProps,
  slotValidator,
  childrenEvaluator,
}: RenderInput<TProps>): AnyVNode {
  const state = prepareRenderState(runtime, props, filterProps)

  // Memoized on first access. Child normalization is shared between development
  // validation and Slot rendering so it runs at most once per render. The evaluators get the
  // full list (text included); the asChild/Slot path narrows back to elements.
  let normalizedChildren: NormalizedChild[] | undefined
  const getNormalizedChildren = (): NormalizedChild[] =>
    (normalizedChildren ??= normalizeChildren(state.children))
  let slotChildren: AnyVNode[] | undefined
  const getSlotChildren = (): AnyVNode[] =>
    (slotChildren ??= getNormalizedChildren().filter(isValidElement) as AnyVNode[])

  if (process.env.NODE_ENV !== 'production') {
    childrenEvaluator?.evaluate(getNormalizedChildren(), {
      tag: state.tag,
      props: state.normalizedProps,
    })
    runtime.options.htmlChildrenEvaluatorFn?.(state.tag)?.evaluate(getNormalizedChildren(), {
      tag: state.tag,
      props: state.normalizedProps,
    })
  }

  const slotResult = tryRenderAsChild(
    state,
    ref,
    slotComponent,
    getNormalizedChildren,
    getSlotChildren,
    slotValidator,
  )

  return slotResult ?? renderIntrinsic(state, ref, runtime)
}
