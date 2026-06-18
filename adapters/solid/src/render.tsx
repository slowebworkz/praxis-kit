import { createEffect, createMemo, splitProps } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
import { isKnownAriaRole } from '@praxis-kit/core'
import { applyFilter } from '@praxis-kit/adapter-utils'
import type { ResolvedProps, SolidElement, UnknownProps } from './types/primitives'
import type { KnownProps } from './types/props'
import type { RenderInput } from './types/render'
import type { Runtime } from './types/runtime'
import type { SlotValidator } from './slot/slot-validator'

declare const process: { env: { NODE_ENV: string } }

// Keys consumed by the adapter — split from pass-through DOM props.
const SPLIT_KEYS = ['as', 'asChild', 'children', 'class', 'variantKey', 'ref'] as const

function toChildArray(children: unknown): unknown[] {
  if (children === undefined || children === null) return []
  if (Array.isArray(children)) return children
  return [children]
}

function buildElementProps(
  props: ResolvedProps,
  classStr: string,
  ref: unknown,
  children: unknown,
): IntrinsicProps {
  const { role, ...rest } = props
  return {
    ...rest,
    class: classStr,
    ...(ref !== undefined && { ref }),
    ...(children !== undefined && { children }),
    ...(isKnownAriaRole(role) && { role }),
  }
}

// Slot props handed to the render function: fully resolved DOM props + class.
// ref is included so the render fn can forward it to the actual DOM element.
// children is excluded — the render fn decides its own children.
function buildSlotProps(props: ResolvedProps, classStr: string, ref: unknown): UnknownProps {
  const { role, ...rest } = props
  return {
    ...rest,
    class: classStr,
    ...(ref !== undefined && { ref }),
    ...(isKnownAriaRole(role) && { role }),
  }
}

function resolveTag(runtime: Runtime, as: unknown): ElementType {
  return runtime.resolveTag(as as ElementType | undefined)
}

function resolveDomProps(
  tag: ElementType,
  elementProps: IntrinsicProps,
  runtime: Runtime,
): UnknownProps {
  return typeof tag === 'string'
    ? (runtime.resolveAria(tag, elementProps).props as UnknownProps)
    : (elementProps as UnknownProps)
}

function tryRenderAsChild(
  known: KnownProps,
  filteredProps: () => ResolvedProps,
  resolvedClass: () => string,
  slotValidator: SlotValidator,
): SolidElement | null {
  if (!known.asChild) return null
  if (known.as !== undefined) {
    slotValidator.assertExclusive()
    return null
  }
  if (!slotValidator.assertRenderFn(known.children)) return null
  const renderFn = known.children as (p: UnknownProps) => SolidElement
  // createMemo tracks filteredProps() and resolvedClass() so slot props stay reactive.
  return createMemo(() =>
    renderFn(buildSlotProps(filteredProps(), resolvedClass(), known.ref)),
  ) as unknown as SolidElement
}

export function render<TProps extends KnownProps>({
  runtime,
  props,
  filterProps,
  slotValidator,
  childrenEvaluator,
}: RenderInput<TProps>): SolidElement {
  const [knownRaw, rest] = splitProps(props, SPLIT_KEYS)
  const known = knownRaw as unknown as KnownProps

  const tag = createMemo(() => resolveTag(runtime, known.as))
  const mergedProps = createMemo(() => runtime.resolveProps(rest as UnknownProps))
  const normalizedProps = createMemo(() => {
    const base = runtime.options.normalizeFn
      ? runtime.options.normalizeFn(mergedProps())
      : mergedProps()
    const htmlNormalizers = runtime.options.htmlPropNormalizersFn?.(tag())
    return htmlNormalizers?.length
      ? htmlNormalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), base)
      : base
  })
  const resolvedClass = createMemo(() =>
    runtime.resolveClasses(
      tag(),
      normalizedProps(),
      known.class as string | undefined,
      known.variantKey as string | undefined,
    ),
  )
  const filteredProps = createMemo(() =>
    applyFilter(normalizedProps(), filterProps, runtime.options.variantKeys),
  )

  // createEffect so validation re-runs reactively when known.children changes.
  if (process.env.NODE_ENV !== 'production' && childrenEvaluator) {
    createEffect(() => childrenEvaluator.evaluate(toChildArray(known.children)))
  }

  const slotResult = tryRenderAsChild(known, filteredProps, resolvedClass, slotValidator)
  if (slotResult !== null) return slotResult

  const domProps = createMemo(() => {
    const ep = buildElementProps(filteredProps(), resolvedClass(), known.ref, known.children)
    return resolveDomProps(tag(), ep, runtime)
  })

  // Dynamic dispatch — tag() and domProps() called directly in JSX so Solid's babel
  // transform wraps them in reactive getters, preserving fine-grained DOM updates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Dynamic component={tag() as any} {...(domProps() as any)} />
}
