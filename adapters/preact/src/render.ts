import { h } from 'preact'
import type { Ref } from 'preact'
import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
import { isKnownAriaRole } from '@praxis-kit/core'
import { applyFilter } from '@praxis-kit/adapter-utils'
import type { SlotValidator } from './slot/slot-validator'
import { isSlottableElement } from './slot'
import type {
  AnyVNode,
  SlotComponent,
  Runtime,
  KnownProps,
  RenderInput,
  ResolvedProps,
  ResolvedSlotRender,
  RenderDirectives,
  ResolvedRenderState,
  FilterPredicate,
} from './types'

declare const process: { env: { NODE_ENV: string } }

function buildDirectives(
  as: ElementType | undefined,
  asChild: boolean | undefined,
): RenderDirectives {
  return {
    ...(as !== undefined && { as }),
    ...(asChild !== undefined && { asChild }),
  }
}

function buildRenderState(
  tag: ElementType,
  directives: RenderDirectives,
  props: ResolvedProps,
  className: string,
  children: unknown,
): ResolvedRenderState {
  const state: {
    tag: ElementType
    directives: RenderDirectives
    props: ResolvedProps
    className: string
    children?: unknown
  } = { tag, directives, props, className }
  if (children !== undefined) state.children = children
  return state
}

function resolveRenderState(
  runtime: Runtime,
  props: KnownProps,
  filterProps: FilterPredicate,
): ResolvedRenderState {
  const { as, asChild, children, className, recipe, ...rest } = props
  const tag = runtime.resolveTag(as)
  const mergedProps = runtime.resolveProps(rest)
  const baseProps = runtime.options.normalizeFn
    ? runtime.options.normalizeFn(mergedProps)
    : mergedProps
  const htmlNormalizers = runtime.options.htmlPropNormalizersFn?.(tag)
  const normalizedProps = htmlNormalizers?.length
    ? htmlNormalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), baseProps)
    : baseProps
  const resolvedClass = runtime.resolveClasses(tag, normalizedProps, className, recipe)
  const filteredProps = applyFilter(normalizedProps, filterProps, runtime.options.variantKeys)
  return buildRenderState(tag, buildDirectives(as, asChild), filteredProps, resolvedClass, children)
}

function warnDiscardedChildren(
  originalChildren: unknown,
  normalizedChildren: AnyVNode[],
  validator: SlotValidator,
): void {
  if (!Array.isArray(originalChildren)) return
  const discarded = originalChildren.length - normalizedChildren.length
  if (discarded > 0) validator.warnDiscardedChildren(discarded)
}

function isSingleElementArray(arr: AnyVNode[]): arr is [AnyVNode] {
  return arr.length === 1
}

function resolveSlotChildren(
  children: unknown,
  normalized: AnyVNode[],
  validator: SlotValidator,
): AnyVNode | AnyVNode[] | null {
  warnDiscardedChildren(children, normalized, validator)
  if (isSingleElementArray(normalized)) {
    return normalized[0]
  }
  if (normalized.length > 1 && normalized.some(isSlottableElement)) {
    return normalized
  }
  validator.assertSingleChild(normalized.length)
  return null
}

function validateSlotDirectives(directives: RenderDirectives, validator: SlotValidator): boolean {
  const { as, asChild } = directives
  if (!asChild) return false
  if (as !== undefined) {
    validator.assertExclusive()
    return false
  }
  return true
}

function resolveSlotRender(
  state: ResolvedRenderState,
  getNormalized: () => AnyVNode[],
  validator: SlotValidator,
): ResolvedSlotRender | null {
  if (!validateSlotDirectives(state.directives, validator)) return null
  const child = resolveSlotChildren(state.children, getNormalized(), validator)
  if (child === null) return null
  return { child }
}

function renderResolvedSlot(
  slotComponent: SlotComponent,
  state: ResolvedRenderState,
  resolved: ResolvedSlotRender,
  ref: Ref<unknown> | null,
): AnyVNode {
  // Dynamic dispatch: Preact's h() overloads can't model arbitrary SlotComponent props statically.
  return (h as (t: unknown, p: unknown) => AnyVNode)(slotComponent, {
    ...state.props,
    className: state.className,
    ref,
    children: resolved.child,
  })
}

function tryRenderAsChild(
  state: ResolvedRenderState,
  ref: Ref<unknown> | null,
  slotComponent: SlotComponent,
  getNormalized: () => AnyVNode[],
  validator: SlotValidator,
): AnyVNode | null {
  const resolved = resolveSlotRender(state, getNormalized, validator)
  if (resolved === null) return null
  return renderResolvedSlot(slotComponent, state, resolved, ref)
}

function buildElementProps(
  props: ResolvedProps,
  className: string,
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
      ? runtime.resolveAria(state.tag, elementProps).props
      : elementProps
  // Dynamic dispatch: IntrinsicProps covers both string and component tags; cast to bypass h() overloads.
  return (h as (t: unknown, p: unknown) => AnyVNode)(state.tag, domProps)
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
  const state = resolveRenderState(runtime, props, filterProps)

  // Lazy — normalizeChildren is called at most once per render, with the result
  // shared between the children evaluator and slot resolution.
  let cached: AnyVNode[] | undefined
  const once = (): AnyVNode[] => (cached ??= normalizeChildren(state.children))

  if (process.env.NODE_ENV !== 'production') childrenEvaluator?.evaluate(once())

  const slotResult = tryRenderAsChild(state, ref, slotComponent, once, slotValidator)

  return slotResult ?? renderIntrinsic(state, ref, runtime)
}
