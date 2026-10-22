import {
  applyFilter,
  composeStyleProps,
  filterOwnedProps,
  mergeCompositionClassNames,
  mergeSlotProps,
  resolveNormalizedProps,
} from '@praxis-kit/adapter-utils'
import type { ClassPipelineFn } from '@praxis-kit/styling'
import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
import { isString } from '@praxis-kit/guards'
import { createEffect, createMemo, mergeProps, splitProps, untrack } from 'solid-js'
import type { ValidComponent } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { SlotValidator } from './slot'
import type {
  FilterPredicate,
  KnownProps,
  RenderInput,
  ResolvedProps,
  Runtime,
  SolidElement,
  UnknownProps,
} from './types'

declare const process: { env: { NODE_ENV: string } }

// Keys consumed by the adapter — split from pass-through DOM props.
const SPLIT_KEYS = ['as', 'asChild', 'children', 'class', 'recipe', 'ref'] as const

function toChildArray(children: unknown): unknown[] {
  if (children === undefined || children === null) return []
  if (Array.isArray(children)) return children
  return [children]
}

function buildElementProps(
  props: ResolvedProps,
  classStr: string | undefined,
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
function buildSlotProps(
  props: ResolvedProps,
  classStr: string | undefined,
  ref: unknown,
): UnknownProps {
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
  normalizedProps: IntrinsicProps,
): UnknownProps {
  return isString(tag)
    ? (runtime.resolveAria(tag, elementProps, normalizedProps).props as UnknownProps)
    : (elementProps as UnknownProps)
}

// Both guards below call into `slotValidator`, which routes through `InvariantBase.violate` —
// an Error-severity diagnostic. Under `strict: 'throw'` (the adapter default) that throws and
// unwinds out of render entirely; nothing here runs after it. Under `strict: 'warn'`/`'silent'`
// it only reports (or does nothing) and returns normally, so `null` is returned to the caller —
// which is *not* "render nothing": `render()` then falls through to the ordinary DOM-tag path,
// exactly as if `asChild` (and, for the first guard, `as`) had never been set. The malformed
// `asChild` usage degrades to a plain render rather than producing a blank/broken result — a
// deliberate contract, pinned by the warn-mode tests in create-contract-component.test.tsx
// ("… in warn mode" cases) alongside the throw-mode ones.
function tryRenderAsChild(
  known: KnownProps,
  filteredProps: () => ResolvedProps,
  resolvedClass: () => string | undefined,
  slotValidator: SlotValidator,
): SolidElement | null {
  if (!known.asChild) return null
  if (known.as !== undefined) {
    slotValidator.assertExclusive()
    return null
  }
  if (!slotValidator.assertRenderFn(known.children)) return null
  const renderFn = known.children as (p: UnknownProps) => SolidElement
  // The render function runs once, untracked, with a reactive props proxy: reads inside the JSX it
  // returns (`<a {...props} />`) stay fine-grained, so a changed slot prop updates the existing
  // element in place instead of re-running the function and replacing the element (which would
  // drop focus, uncontrolled state and any ref held on it). Re-runs only when the function itself
  // or a tracked read outside the proxy changes.
  const slotProps = mergeProps(() => buildSlotProps(filteredProps(), resolvedClass(), known.ref))
  return createMemo(() =>
    untrack(() => renderFn(slotProps as UnknownProps)),
  ) as unknown as SolidElement
}

/**
 * Renders `compose`'s synthesized composition: `withComponent` always as if given an `asChild`
 * render callback whose output is this component's own normal (non-`asChild`) output, merged
 * with whatever slot props `withComponent` hands back — the Solid-native equivalent of the
 * clone-based synthesis React/Preact/Vue use, since Solid has no cheap clone-and-merge-props
 * primitive to bolt extra props onto an already-built `SolidElement` after the fact. Resolves
 * this component's own tag/DOM props directly (mirroring `render()`'s own intrinsic-path
 * computation) rather than calling `render()` itself, since the merge has to happen *before* the
 * final `<Dynamic>` is created, not after.
 *
 * `allProps` additionally spreads this component's own raw props onto `withComponent`,
 * excluding `as` (consumed to choose this component's host tag), `asChild`, `ref`, and `children`
 * (which are explicitly supplied below). Other ordinary props, including `class` and
 * `recipe`, remain forwardable so the partner's contract can resolve variants/compounds against
 * them — opt-in, mirroring the other adapters.
 */
export function renderComposed<TProps extends KnownProps>(
  withComponent: unknown,
  runtime: Runtime,
  props: TProps,
  filterProps: FilterPredicate,
  ref: unknown,
  allProps?: boolean,
  defaults?: object,
  compositionClassResolver?: {
    resolve: ClassPipelineFn
    primary: Parameters<typeof composeStyleProps>[2]
    partner: Parameters<typeof composeStyleProps>[4]
    ownedKeys: ReadonlySet<string>
  },
  reservedOwnedKeys: ReadonlySet<string> = new Set(),
): SolidElement {
  const [knownRaw, rest] = splitProps(props, SPLIT_KEYS)
  const known = knownRaw as unknown as KnownProps
  // `splitProps`, not plain destructuring — Solid's props are reactive proxies, and destructuring
  // one directly (outside a tracking scope) would read it eagerly and break that reactivity, the
  // same reason `known`/`rest` above go through `splitProps` rather than `const { as, ... } = props`.
  const [, forwardableProps] = splitProps(props, [
    'as',
    'asChild',
    'ref',
    'children',
    ...reservedOwnedKeys,
  ])

  const tag = createMemo(() => resolveTag(runtime, known.as))
  const mergedProps = createMemo(() => runtime.resolveProps(rest as UnknownProps))
  const normalizedProps = createMemo(() =>
    resolveNormalizedProps(runtime.options, tag(), mergedProps()),
  )
  // With a Praxis partner the combined resolver below owns class resolution. The primary must not
  // also resolve on its own: it would reject a recipe that only the partner defines, and its
  // result is replaced by the combined class anyway.
  const resolvedClass = createMemo(() =>
    compositionClassResolver
      ? undefined
      : runtime.resolveClasses(
          tag(),
          normalizedProps(),
          known.class as string | undefined,
          known.recipe as string | undefined,
        ),
  )
  const filteredProps = createMemo(() =>
    applyFilter(normalizedProps(), filterProps, runtime.options.variantKeys),
  )
  const domProps = createMemo(() => {
    const ep = buildElementProps(filteredProps(), resolvedClass(), known.ref, known.children)
    return resolveDomProps(tag(), ep, runtime, normalizedProps())
  })

  return (
    <Dynamic
      component={withComponent as ValidComponent}
      {...filterOwnedProps(defaults, reservedOwnedKeys)}
      {...(allProps ? forwardableProps : undefined)}
      asChild
      ref={ref}
    >
      {(withProps: UnknownProps) => {
        // The partner's own resolved `withProps.class` is superseded by the combined pipeline, but
        // an explicit `class` supplied through `compose.defaults` is caller input and must survive.
        const configuredClass = defaults ? Reflect.get(defaults, 'class') : undefined
        const defaultClass =
          isString(configuredClass) || Array.isArray(configuredClass) ? configuredClass : undefined
        const composedClass = compositionClassResolver
          ? createMemo(() =>
              compositionClassResolver.resolve(
                tag(),
                composeStyleProps(
                  {
                    ...filterOwnedProps(defaults, reservedOwnedKeys),
                    ...(allProps ? filterOwnedProps(props, reservedOwnedKeys) : {}),
                  },
                  props,
                  compositionClassResolver.primary,
                  defaults,
                  compositionClassResolver.partner,
                  compositionClassResolver.ownedKeys,
                ),
                mergeCompositionClassNames(defaultClass, known.class as string | undefined),
                isString(known.recipe) ? known.recipe : undefined,
              ),
            )
          : undefined
        const slotProps = mergeSlotProps(withProps, domProps())
        // `tryRenderAsChild` executes its render callback untracked. Keep the composed class as a
        // getter instead of eagerly evaluating `composedClass()` here, so Solid's DOM-prop spread
        // can track class changes and update the mounted element without rerunning the callback.
        const finalProps = composedClass
          ? {
              ...slotProps,
              get class() {
                return composedClass()
              },
            }
          : slotProps

        return (
          <Dynamic
            component={tag() as unknown as ValidComponent}
            {...(finalProps as UnknownProps)}
          />
        )
      }}
    </Dynamic>
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
  const normalizedProps = createMemo(() =>
    resolveNormalizedProps(runtime.options, tag(), mergedProps()),
  )
  const resolvedClass = createMemo(() =>
    runtime.resolveClasses(
      tag(),
      normalizedProps(),
      known.class as string | undefined,
      known.recipe as string | undefined,
    ),
  )
  const filteredProps = createMemo(() =>
    applyFilter(normalizedProps(), filterProps, runtime.options.variantKeys),
  )

  const { allowedAs } = runtime.options
  if (allowedAs !== undefined) {
    // createEffect so enforcement re-runs reactively when tag() changes.
    createEffect(() =>
      enforceAllowedAs(tag(), allowedAs, runtime.options.diagnostics, runtime.options.displayName),
    )
  }

  // createEffect so validation re-runs reactively when known.children or tag() changes —
  // tag() is read here (not just inside childrenEvaluator) so a dynamic(...) cardinality
  // rule that varies by `as` re-resolves whenever the resolved tag changes.
  if (process.env.NODE_ENV !== 'production' && childrenEvaluator) {
    createEffect(() =>
      childrenEvaluator.evaluate(toChildArray(known.children), {
        tag: tag(),
        props: normalizedProps(),
      }),
    )
  }

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() =>
      runtime.options
        .htmlChildrenEvaluatorFn?.(tag())
        ?.evaluate(toChildArray(known.children), { tag: tag(), props: normalizedProps() }),
    )
  }

  const slotResult = tryRenderAsChild(known, filteredProps, resolvedClass, slotValidator)
  if (slotResult !== null) return slotResult

  const domProps = createMemo(() => {
    const ep = buildElementProps(filteredProps(), resolvedClass(), known.ref, known.children)
    return resolveDomProps(tag(), ep, runtime, normalizedProps())
  })

  // Dynamic dispatch — tag() and domProps() called directly in JSX so Solid's babel
  // transform wraps them in reactive getters, preserving fine-grained DOM updates.
  return (
    <Dynamic component={tag() as unknown as ValidComponent} {...(domProps() as UnknownProps)} />
  )
}
