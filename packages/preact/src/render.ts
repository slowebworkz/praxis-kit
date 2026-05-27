import { h } from 'preact'
import type { Ref } from 'preact'
import type { ElementType, IntrinsicProps } from '@polymorphic-ui/core'
import { isKnownAriaRole } from '@polymorphic-ui/core'
import { applyFilter } from '@polymorphic-ui/adapter-utils'
import type { SlotValidator } from './slot/slot-validator'
import { isSlottableElement } from './slot'
import type {
  AnyVNode,
  SlotComponent,
  Runtime,
  KnownProps,
  RenderInput,
  NormalizeChildren,
  ResolvedProps,
  ResolvedSlotRender,
  RenderDirectives,
  ResolvedRenderState,
  FilterPredicate,
} from './types'

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
  const { as, asChild, children, className, variantKey, ...rest } = props
  const tag = runtime.resolveTag(as)
  const mergedProps = runtime.resolveProps(rest)
  const resolvedClass = runtime.resolveClasses(tag, mergedProps, className, variantKey)
  const filteredProps = applyFilter(mergedProps, filterProps, runtime.options.variantKeys)
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
  normalizeChildren: NormalizeChildren,
  validator: SlotValidator,
): AnyVNode | AnyVNode[] | null {
  const normalized = normalizeChildren(children)
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
  normalizeChildren: NormalizeChildren,
  validator: SlotValidator,
): ResolvedSlotRender | null {
  if (!validateSlotDirectives(state.directives, validator)) return null
  const child = resolveSlotChildren(state.children, normalizeChildren, validator)
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
  normalizeChildren: NormalizeChildren,
  validator: SlotValidator,
): AnyVNode | null {
  const resolved = resolveSlotRender(state, normalizeChildren, validator)
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

  childrenEvaluator?.evaluate(normalizeChildren(state.children))

  const slotResult = tryRenderAsChild(state, ref, slotComponent, normalizeChildren, slotValidator)

  return slotResult ?? renderIntrinsic(state, ref, runtime)
}
