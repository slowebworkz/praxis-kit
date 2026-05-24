import { createMemo, splitProps } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { ElementType, IntrinsicProps } from '@polymorphic-ui/core'
import { isKnownAriaRole } from '@polymorphic-ui/core'
import type { FilterPredicate, ResolvedProps, SolidElement, UnknownProps } from './types/primitives'
import type { KnownProps } from './types/props'
import type { RenderInput } from './types/render'
import type { Runtime } from './types/runtime'

// Keys consumed by the adapter — split from pass-through DOM props.
const SPLIT_KEYS = ['as', 'children', 'class', 'variantKey', 'ref'] as const

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

function resolveTag(runtime: Runtime, as: unknown): ElementType {
  return runtime.resolveTag(as as ElementType | undefined)
}

function resolveDomProps(
  tag: ElementType,
  elementProps: IntrinsicProps,
  runtime: Runtime,
): Record<string, unknown> {
  return typeof tag === 'string'
    ? (runtime.resolveAria(tag, elementProps).props as Record<string, unknown>)
    : (elementProps as Record<string, unknown>)
}

export function render<TProps extends KnownProps>({
  runtime,
  props,
  filterProps,
  childrenEvaluator,
}: RenderInput<TProps>): SolidElement {
  const [knownRaw, rest] = splitProps(props, SPLIT_KEYS)
  const known = knownRaw as unknown as KnownProps

  const tag = createMemo(() => resolveTag(runtime, known.as))
  const mergedProps = createMemo(() => runtime.resolveProps(rest as UnknownProps))
  const resolvedClass = createMemo(() =>
    runtime.resolveClasses(
      tag(),
      mergedProps(),
      known.class as string | undefined,
      known.variantKey as string | undefined,
    ),
  )
  const filteredProps = createMemo(() =>
    applyFilter(mergedProps(), filterProps, runtime.options.variantKeys),
  )
  const domProps = createMemo(() => {
    const ep = buildElementProps(filteredProps(), resolvedClass(), known.ref, known.children)
    return resolveDomProps(tag(), ep, runtime)
  })

  childrenEvaluator?.evaluate(toChildArray(known.children))

  // Dynamic dispatch — tag() and domProps() called directly in JSX so Solid's babel
  // transform wraps them in reactive getters, preserving fine-grained DOM updates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Dynamic component={tag() as any} {...(domProps() as any)} />
}
