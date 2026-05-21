import { cloneVNode, h } from 'vue'
import type { VNode } from 'vue'
import type { AriaPolicyEngine, ElementType, IntrinsicProps } from '@polymorphic-ui/core'
import { isKnownAriaRole } from '@polymorphic-ui/core'
import type { SlotValidator } from './slot'
import { normalizeChildren } from './normalize-children'
import type {
  FilterPredicate,
  ResolvedProps,
  UnknownProps,
  KnownProps,
  RenderInput,
  RenderDirectives,
  ResolvedRenderState,
  Runtime,
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

function resolveRenderState(
  runtime: Runtime,
  attrs: Readonly<UnknownProps>,
  filterProps: FilterPredicate,
): ResolvedRenderState {
  const { as, asChild, class: className, variantKey, ...rest } = attrs as KnownProps
  const tag = runtime.resolveTag(as as ElementType | undefined)
  const mergedProps = runtime.resolveProps(rest as UnknownProps)
  const resolvedClass = runtime.resolveClasses(
    tag,
    mergedProps,
    typeof className === 'string' ? className : undefined,
    typeof variantKey === 'string' ? variantKey : undefined,
  )
  const filteredProps = applyFilter(mergedProps, filterProps, runtime.options.variantKeys)
  return {
    tag,
    directives: buildDirectives(as as ElementType | undefined, asChild as boolean | undefined),
    className: resolvedClass,
    props: filteredProps,
  }
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

function tryRenderAsChild(
  state: ResolvedRenderState,
  children: VNode[],
  validator: SlotValidator,
): VNode | null {
  if (!validateSlotDirectives(state.directives, validator)) return null

  if (children.length === 1) {
    const child = children[0]
    if (child === undefined) return null
    // cloneVNode merges extra props onto the existing VNode without changing its type,
    // making it the Vue equivalent of React's cloneElement for the asChild pattern.
    return cloneVNode(child, { ...state.props, class: state.className })
  }

  validator.assertSingleChild(children.length)
  return null
}

function buildDomProps(
  props: ResolvedProps,
  className: string,
  ariaEngine: AriaPolicyEngine,
  tag: ElementType,
): UnknownProps {
  const { role, ...rest } = props

  const base: UnknownProps = {
    ...rest,
    class: className,
    ...(isKnownAriaRole(role) && { role }),
  }

  if (typeof tag !== 'string') return base

  // Validate ARIA attrs for intrinsic elements. The engine checks role and
  // aria-* attributes — cast is safe because we only read those keys.
  const validated = ariaEngine.validate(tag, base as unknown as IntrinsicProps)
  // The engine's output shape is React-style (className, ref, children); strip those
  // React-specific keys and restore `class` so the VNode stays Vue-idiomatic.
  const {
    className: _className,
    ref: _ref,
    children: _children,
    ...validatedRest
  } = validated.props as UnknownProps & { className?: unknown; ref?: unknown; children?: unknown }
  return { ...validatedRest, class: className }
}

export function render({
  runtime,
  attrs,
  slots,
  filterProps,
  slotValidator,
  ariaEngine,
  childrenEvaluator,
}: RenderInput): VNode | null {
  const state = resolveRenderState(runtime, attrs, filterProps)

  const children = normalizeChildren(slots)
  childrenEvaluator?.evaluate(children)

  const slotResult = tryRenderAsChild(state, children, slotValidator)
  if (slotResult !== null) return slotResult

  const domProps = buildDomProps(state.props, state.className, ariaEngine, state.tag)
  // Pass children as a slot object rather than a flat array so the same code path
  // works for both intrinsic elements and dynamic component tags.
  return h(state.tag, domProps, slots.default ? { default: slots.default } : undefined)
}
