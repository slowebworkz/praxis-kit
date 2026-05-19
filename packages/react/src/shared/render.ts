import { createElement } from 'react'
import { jsx } from 'react/jsx-runtime'
import type { ReactElement, Ref } from 'react'
import type { AriaPolicyEngine, ElementType, IntrinsicProps } from '@polymorphic-ui/core'
import { isKnownAriaRole } from '@polymorphic-ui/core'
import type { SlotValidator } from './slot'
import { isSlottableElement } from './slot'
import type {
  UnknownProps,
  SlotComponent,
  Runtime,
  KnownProps,
  RenderInput,
  NormalizeChildren,
  ResolvedProps,
  ResolvedSlotRender,
  RenderDirectives,
  FilterPredicate,
  ResolvedRenderState,
} from './types'

function applyFilter<T extends ResolvedProps>(
  props: T,
  filterProps: FilterPredicate,
  variantKeys: ReadonlySet<string>,
): T {
  const out = {} as T
  for (const [k, v] of Object.entries(props)) {
    if (!filterProps(k, variantKeys)) (out as UnknownProps)[k] = v
  }
  return out
}

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
  normalizedChildren: ReactElement[],
  validator: SlotValidator,
): void {
  if (!Array.isArray(originalChildren)) return
  const discarded = originalChildren.length - normalizedChildren.length
  if (discarded > 0) validator.warnDiscardedChildren(discarded)
}

function isSingleElementArray(arr: ReactElement[]): arr is [ReactElement] {
  return arr.length === 1
}

function resolveSlotChildren(
  children: unknown,
  normalizeChildren: NormalizeChildren,
  validator: SlotValidator,
): ReactElement | ReactElement[] | null {
  const normalized = normalizeChildren(children)
  warnDiscardedChildren(children, normalized, validator)
  if (isSingleElementArray(normalized)) {
    return normalized[0]
  }
  // Slottable sibling pattern: [element, <Slottable>] — Slot handles the merge internally.
  if (normalized.length > 1 && normalized.some(isSlottableElement)) {
    return normalized
  }
  validator.assertSingleChild(normalized.length)
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
): ReactElement {
  return jsx(slotComponent, {
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
): ReactElement | null {
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
  ariaEngine: AriaPolicyEngine,
): ReactElement {
  const elementProps = buildElementProps(state.props, state.className, ref, state.children)
  const domProps =
    typeof state.tag === 'string'
      ? ariaEngine.validate(state.tag, elementProps).props
      : elementProps
  return createElement(state.tag, domProps)
}

export function render<TProps extends KnownProps>({
  runtime,
  props,
  ref,
  slotComponent,
  normalizeChildren,
  filterProps,
  slotValidator,
  ariaEngine,
  childrenEvaluator,
}: RenderInput<TProps>): ReactElement {
  const state = resolveRenderState(runtime, props, filterProps)

  childrenEvaluator?.evaluate(normalizeChildren(state.children))

  const slotResult = tryRenderAsChild(state, ref, slotComponent, normalizeChildren, slotValidator)

  return slotResult ?? renderIntrinsic(state, ref, ariaEngine)
}
