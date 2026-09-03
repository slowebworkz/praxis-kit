import { applyFilter, resolveNormalizedProps } from '@praxis-kit/adapter-utils'
import type { ElementType } from '@praxis-kit/core'
import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
import type { AnyRecord } from '@praxis-kit/primitive'
import type { Slots, VNode, VNodeRef } from 'vue'
import { cloneVNode, h } from 'vue'
import { normalizeChildren } from './normalize-children'
import type { SlotValidator } from './slot'
import { extractSlottable } from './slot/extractSlottable'
import { isElementVNode, isTextVNode } from './slot/predicates'
import type {
  FilterPredicate,
  KnownProps,
  RenderDirectives,
  RenderInput,
  ResolvedRenderState,
  Runtime,
} from './types'

declare const process: { env: { NODE_ENV: string } }

// Vue's event system resolves a listener prop as `hyphenate(key.slice(2))` (after stripping any
// trailing `Once` / `Passive` / `Capture` modifier), so a multi-word handler like `onKeyDown`
// binds to a `key-down` event that never fires. Collapsing the event name to a single leading
// capital (`onKeyDown` → `onKeydown` → `hyphenate` → `keydown`) fixes that while keeping the key
// in the `on` + uppercase form Vue recognises as a handler, and leaving the modifier suffix
// intact so `onClickCapture` / `onScrollPassiveOnce` still parse. Single-word handlers
// (`onClick`, `onInput`) and non-listener keys are untouched.
const EVENT_KEY_RE = /^on[A-Z]/
const EVENT_MODIFIER_RE = /(?:Once|Passive|Capture)+$/

function normalizeListenerKey(key: string): string {
  if (!EVENT_KEY_RE.test(key)) return key
  const modifiers = key.match(EVENT_MODIFIER_RE)?.[0] ?? ''
  const event = (modifiers ? key.slice(0, key.length - modifiers.length) : key).slice(2)
  return 'on' + event[0] + event.slice(1).toLowerCase() + modifiers
}

function normalizeListenerKeys(props: AnyRecord): AnyRecord {
  const out: AnyRecord = {}
  for (const k in props) out[normalizeListenerKey(k)] = props[k]
  return out
}

/**
 * Props the wrapper contributes onto the `asChild` target. Mirrors `buildElementProps` (the
 * intrinsic path) so the two stay in step: listener keys normalized, `class` only when defined,
 * `role` only when a recognized ARIA role, plus the `onElement` function ref.
 *
 * The actual merge with the child's own props is left to Vue's `cloneVNode` → `mergeProps`,
 * which chains `onXxx` handlers, concatenates `class`, and shallow-merges `style` — the same
 * policy the React/Preact Slot uses (`mergeSlotProps` in `@praxis-kit/adapter-utils`). `../pk`
 * forwarded only string/number/boolean attributes here, silently dropping `@click` / `:style` /
 * object props — that divergence from the other adapters is fixed.
 */
function buildAsChildProps(
  props: AnyRecord,
  className: string | undefined,
  elementRef: ((element: Element | null) => void) | undefined,
): AnyRecord {
  const { role, ...rest } = props
  return {
    ...normalizeListenerKeys(rest),
    ...(className !== undefined && { class: className }),
    ...(isKnownAriaRole(role) && { role }),
    ...(elementRef !== undefined && { ref: elementRef as unknown as VNodeRef }),
  }
}

export function prepareRenderState(
  runtime: Runtime,
  attrs: KnownProps,
  filterProps: FilterPredicate,
): ResolvedRenderState {
  const { as, asChild, class: callerClass, recipe, ...rest } = attrs

  const tag: ElementType = typeof as === 'string' ? as : runtime.options.defaultTag
  if (runtime.options.allowedAs !== undefined) {
    enforceAllowedAs(
      tag,
      runtime.options.allowedAs,
      runtime.options.diagnostics,
      runtime.options.displayName,
    )
  }

  const mergedProps = runtime.resolveProps(rest)
  const normalizedProps = resolveNormalizedProps(runtime.options, tag, mergedProps)

  const className = runtime.resolveClasses(tag, normalizedProps, callerClass, recipe)
  const filteredProps = applyFilter(normalizedProps, filterProps, runtime.options.variantKeys)

  return {
    tag,
    directives: {
      ...(typeof as === 'string' && { as }),
      ...(asChild !== undefined && { asChild }),
    },
    props: filteredProps,
    normalizedProps,
    className,
  }
}

function buildElementProps(
  props: AnyRecord,
  className: string | undefined,
  elementRef: ((element: Element | null) => void) | undefined,
): AnyRecord {
  const { role, ...rest } = props
  return {
    ...normalizeListenerKeys(rest),
    // Vue's SSR renderer and its client-side patcher disagree on `class: undefined` — SSR's
    // normalizeClass turns it into '' and still emits class="", while the client patcher
    // removes the attribute outright. Omitting the key entirely keeps both paths consistent.
    ...(className !== undefined && { class: className }),
    ...(isKnownAriaRole(role) && { role }),
    // Vue calls a function-ref with the element on mount and with null on unmount, same
    // contract as React/Preact's callback refs — a natural fit for FactoryOptions.onElement.
    // Cast: Vue's own VNodeRef type also accepts a resolved *component* instance, since refs
    // can target components as well as elements — irrelevant here, this is only ever attached
    // to an intrinsic host tag, which always resolves to a real Element.
    ...(elementRef !== undefined && { ref: elementRef as unknown as VNodeRef }),
  }
}

function renderIntrinsic(
  state: ResolvedRenderState,
  runtime: Runtime,
  slots: Slots,
  elementRef: ((element: Element | null) => void) | undefined,
): VNode {
  const elementProps = buildElementProps(state.props, state.className, elementRef)
  const domProps = runtime.resolveAria(
    state.tag as string,
    elementProps,
    state.normalizedProps,
  ).props
  return h(state.tag, domProps, slots.default ? { default: slots.default } : undefined)
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

/**
 * Warn about children the asChild path drops: non-VNode junk from the slot (`discarded`, already
 * counted by `normalizeChildren`) plus any text vnode siblings excluded from the single-element
 * target. Comment / Static / Fragment vnodes are not counted — `v-if="false"` renders a Comment
 * and it is not "discarded" content.
 */
function reportDiscarded(
  children: VNode[],
  kept: VNode[],
  discardedNonVNodes: number,
  validator: SlotValidator,
): void {
  const droppedText = children.filter((c) => isTextVNode(c) && !kept.includes(c)).length
  const total = discardedNonVNodes + droppedText
  if (total > 0) validator.warnDiscardedChildren(total)
}

function tryRenderAsChild(
  state: ResolvedRenderState,
  children: VNode[],
  discarded: number,
  validator: SlotValidator,
  elementRef: ((element: Element | null) => void) | undefined,
): VNode | null {
  if (!validateSlotDirectives(state.directives, validator)) return null

  const attrs = buildAsChildProps(state.props, state.className, elementRef)

  const slottable = extractSlottable(children)
  if (slottable) {
    reportDiscarded(children, [slottable.child], discarded, validator)
    return slottable.rebuild(cloneVNode(slottable.child, attrs))
  }

  // The Slot target must be an element/component vnode — Text / Comment (`v-if="false"`) /
  // Fragment vnodes are valid children but not clone targets.
  const elementChildren = children.filter(isElementVNode)
  reportDiscarded(children, elementChildren, discarded, validator)

  if (elementChildren.length === 1 && elementChildren[0] !== undefined) {
    return cloneVNode(elementChildren[0], attrs)
  }

  // Non-throw modes: warned and fell through — render normally as a fallback.
  validator.assertSingleChild(elementChildren.length)
  return null
}

export function render({
  runtime,
  state,
  slots,
  slotValidator,
  childrenEvaluator,
  elementRef,
}: RenderInput): VNode {
  const { vnodes: children, discarded } = normalizeChildren(slots)

  if (process.env.NODE_ENV !== 'production') {
    childrenEvaluator?.evaluate(children, { tag: state.tag, props: state.normalizedProps })
    runtime.options
      .htmlChildrenEvaluatorFn?.(state.tag)
      ?.evaluate(children, { tag: state.tag, props: state.normalizedProps })
  }

  const slotResult = tryRenderAsChild(state, children, discarded, slotValidator, elementRef)
  return slotResult ?? renderIntrinsic(state, runtime, slots, elementRef)
}
