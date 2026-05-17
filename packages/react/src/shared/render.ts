import { createElement } from 'react'
import { jsx } from 'react/jsx-runtime'
import type { ReactElement, Ref } from 'react'
import type { ElementType } from '@polymorphic-ui/core'
import type { SlotValidator } from './slot/slot-validator'
import type {
  UnknownProps,
  SlotComponent,
  Runtime,
  KnownProps,
  RenderInput,
  NormalizeChildren,
  ResolvedProps,
  RenderDirectives,
  FilterPredicate,
  ResolvedRenderState,
} from './types'

function applyFilter<T extends ResolvedProps>(
  props: T,
  filterProps: FilterPredicate,
  variantKeys: ReadonlySet<string>,
): T {
  const out: UnknownProps = {}
  for (const [k, v] of Object.entries(props)) {
    if (!filterProps(k, variantKeys)) out[k] = v
  }
  return out as T
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

  const directives: { as?: ElementType; asChild?: boolean } = {}
  if (as !== undefined) directives.as = as
  if (asChild !== undefined) directives.asChild = asChild

  const state: {
    tag: ElementType
    directives: RenderDirectives
    props: ResolvedProps
    className: string
    children?: unknown
  } = { tag, directives, props: filteredProps, className: resolvedClass }

  if (children !== undefined) state.children = children

  return state
}

function resolveSlotChildren(
  children: unknown,
  normalizeChildren: NormalizeChildren,
  validator: SlotValidator,
): ReactElement[] | null {
  const normalized = normalizeChildren(children)
  if (Array.isArray(children)) {
    const discarded = children.length - normalized.length
    if (discarded > 0) validator.warnDiscardedChildren(discarded)
  }
  if (normalized.length !== 1) {
    validator.assertSingleChild(normalized.length)
    // Non-throw modes: warned and fell through — render normally as a fallback.
    return null
  }
  return normalized
}

function tryRenderAsChild(
  state: ResolvedRenderState,
  ref: Ref<unknown> | null,
  slotComponent: SlotComponent,
  normalizeChildren: NormalizeChildren,
  validator: SlotValidator,
): ReactElement | null {
  const { as, asChild } = state.directives
  if (!asChild) return null
  if (as !== undefined) {
    validator.assertExclusive()
    // Non-throw modes: warned and fell through — render normally as a fallback.
    return null
  }

  const normalizedChildren = resolveSlotChildren(state.children, normalizeChildren, validator)
  if (normalizedChildren === null) return null

  return jsx(slotComponent, {
    ...state.props,
    className: state.className,
    ref,
    children: normalizedChildren[0]!,
  }) as ReactElement
}

function renderIntrinsic(state: ResolvedRenderState, ref: Ref<unknown> | null): ReactElement {
  const elementProps: UnknownProps = { ...state.props, className: state.className, ref }
  if (state.children !== undefined) elementProps['children'] = state.children
  return createElement(state.tag, elementProps)
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
}: RenderInput<TProps>): ReactElement {
  const state = resolveRenderState(runtime, props, filterProps)

  childrenEvaluator?.evaluate(normalizeChildren(state.children))

  const slotResult = tryRenderAsChild(state, ref, slotComponent, normalizeChildren, slotValidator)

  return slotResult ?? renderIntrinsic(state, ref)
}
