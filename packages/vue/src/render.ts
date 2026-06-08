import { cloneVNode, h } from 'vue'
import type { VNode } from 'vue'
import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
import { isKnownAriaRole } from '@praxis-kit/core'
import { applyFilter } from '@praxis-kit/adapter-utils'
import type { SlotValidator } from './slot'
import { extractSlottable } from './slot/extractSlottable'
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

export function resolveRenderState(
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
  discarded: number,
  validator: SlotValidator,
): VNode | null {
  if (!validateSlotDirectives(state.directives, validator)) return null

  if (discarded > 0) validator.warnDiscardedChildren(discarded)

  const extraction = extractSlottable(children)
  if (extraction) {
    // cloneVNode merges extra props (class, style, onX handlers) onto the existing VNode.
    const merged = cloneVNode(extraction.child, { ...state.props, class: state.className })
    return extraction.rebuild(merged)
  }

  if (children.length === 1) {
    const child = children[0]
    if (child === undefined) return null
    return cloneVNode(child, { ...state.props, class: state.className })
  }

  validator.assertSingleChild(children.length)
  return null
}

// Vue's hyphenate converts onKeyDown → 'key-down' (an invalid event name).
// Normalize multi-word camelCase event handlers to all-lowercase so Vue's
// hyphenate produces the correct DOM event type: onKeydown → 'keydown'.
const MULTI_WORD_EVENT_RE = /^on[A-Z][a-z]+[A-Z]/
function normalizeEventKeys(props: UnknownProps): UnknownProps {
  const out: Record<string, unknown> = {}
  for (const k in props) {
    out[MULTI_WORD_EVENT_RE.test(k) ? 'on' + k.slice(2).toLowerCase() : k] = (
      props as Record<string, unknown>
    )[k]
  }
  return out as UnknownProps
}

function buildDomProps(
  runtime: Runtime,
  props: ResolvedProps,
  className: string,
  tag: ElementType,
): UnknownProps {
  const { role, ...rest } = normalizeEventKeys(props)

  const base: UnknownProps = {
    ...rest,
    class: className,
    ...(isKnownAriaRole(role) && { role }),
  }

  if (typeof tag !== 'string') return base

  // Validate ARIA attrs for intrinsic elements. The engine checks role and
  // aria-* attributes — cast is safe because we only read those keys.
  const validated = runtime.resolveAria(tag, base as unknown as IntrinsicProps)
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
  childrenEvaluator,
  resolvedState,
}: RenderInput): VNode | null {
  const state = resolvedState ?? resolveRenderState(runtime, attrs, filterProps)

  const { vnodes: children, discarded } = normalizeChildren(slots)
  if (process.env.NODE_ENV !== 'production') childrenEvaluator?.evaluate(children)

  const slotResult = tryRenderAsChild(state, children, discarded, slotValidator)
  if (slotResult !== null) return slotResult

  const domProps = buildDomProps(runtime, state.props, state.className, state.tag)
  // Pass children as a slot object rather than a flat array so the same code path
  // works for both intrinsic elements and dynamic component tags.
  return h(state.tag, domProps, slots.default ? { default: slots.default } : undefined)
}
