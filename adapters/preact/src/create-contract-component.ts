import type {
  AnyClassPluginFactory,
  AnyRecord,
  ContractPluginOf,
  ContractPresetOf,
  ContractPropsOf,
  ContractTagOf,
  ContractVariantsOf,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  MergeRecords,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import {
  diagnoseIncompleteComposition,
  attachCompositionStyleMetadata,
  composeStyleProps,
  createCompositionStyleResolver,
  getCompositionStyleMetadata,
  mergeCompositionClassNames,
  COMPOSITION_STYLE_REQUEST_PROP,
  isCompositionStyleRequest,
  finalizeComponent,
  invariant,
} from '@praxis-kit/adapter-utils'
import { isFunction, isString } from '@praxis-kit/guards'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import { h } from 'preact'
import type { ComponentType } from 'preact'
import { forwardRef } from 'preact/compat'
import type { ForwardedRef } from 'preact/compat'
import { useCallback, useRef } from 'preact/hooks'
import { applyDisplayName } from './apply-display-name'
import { render } from './render'
import { buildRuntime } from './build-runtime'
import { isPolymorphicComponent } from './is-polymorphic-component'
import { mergeRefs } from './slot/composeRefs'
import { isPreactFactoryOptions } from './to-preact-factory-options'
import type { AnyVNode, PolymorphicComponent, UnknownProps } from './types'
import type { PreactFactoryOptions } from './preact-options'

/**
 * Creates a polymorphic Preact component with praxis-kit contracts applied.
 *
 * ```tsx
 * const Button = createContractComponent({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: {
 *     base: 'btn',
 *     variants: { intent: { primary: 'btn--primary', ghost: 'btn--ghost' } },
 *     defaults: { intent: 'primary' },
 *   },
 * })
 *
 * <Button intent="ghost" as="a" href="/home">Home</Button>
 * ```
 *
 * Returns a `forwardRef` component — `ref` is forwarded to the rendered host element. Pass
 * `subComponents` to attach named sub-components (`Card.Header`) and `onElement` to run setup
 * once the real DOM element exists.
 *
 * `TDefault`/`Props`/`Variants`/`TPreset`/`TPlugin` are each `ContractXOf<C>`-derived *defaults*
 * on this function's own type parameter list, mirroring `@praxis-kit/react`'s identical fix — see
 * that adapter's own doc comment for why (computed as function type-parameter defaults, not inline
 * body computations, which doesn't resolve for a still-abstract `C`). No `TAllowed` here, matching
 * this adapter's pre-refactor behavior — Preact never threaded it as its own generic.
 */
export function createContractComponent<
  C extends PreactFactoryOptions,
  TDefault extends ElementType = ContractTagOf<C>,
  Props extends UnknownProps = ContractPropsOf<C>,
  Variants extends Readonly<VariantMap> = ContractVariantsOf<C>,
  TPreset extends RecipeMap<VariantMap> = ContractPresetOf<C>,
  TPlugin extends AnyClassPluginFactory = ContractPluginOf<C>,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: C & {
    readonly subComponents?: TSubComponents
  },
): MergeRecords<
  PolymorphicComponent<
    PolymorphicGenerics<
      TDefault,
      MergeRecords<Props, ExtractPluginProps<TPlugin>>,
      Variants,
      TPreset
    >,
    C
  >,
  TSubComponents
> {
  invariant(isPreactFactoryOptions(options), 'options is not a valid PreactFactoryOptions object')
  /**
   * `C` and `TDefault`/`Props`/`Variants`/`TPreset` are formally independent type parameters to
   * the checker — see `@praxis-kit/react`'s identical comment for the full explanation. The
   * `invariant` above is what actually guarantees `options` is `PreactFactoryOptions` shaped; this
   * assertion bridges the gap in the compiler's reasoning.
   */
  const bundle = buildRuntime(
    options as unknown as PreactFactoryOptions<TDefault, Props, Variants, TPreset>,
  )
  diagnoseIncompleteComposition(options.compose, options.name, bundle.runtime.options.diagnostics)
  const { onElement, compose } = options
  const partnerStyleMetadata = getCompositionStyleMetadata(compose?.with)
  const compositionClassResolver = partnerStyleMetadata
    ? createCompositionStyleResolver(
        bundle.runtime.options,
        partnerStyleMetadata,
        compose?.defaults,
        (message) =>
          bundle.runtime.options.diagnostics.warn({
            code: DiagnosticCode.CompositionVariantCollision,
            category: DiagnosticCategory.Composition,
            message,
            ...(options.name !== undefined && { component: options.name }),
          }),
      )
    : undefined

  const Component = forwardRef(function Component(
    props: UnknownProps,
    ref: ForwardedRef<unknown>,
  ): AnyVNode {
    const compositionStyleRequestValue = props[COMPOSITION_STYLE_REQUEST_PROP]
    const compositionStyleRequest = isCompositionStyleRequest(compositionStyleRequestValue)
      ? compositionStyleRequestValue
      : undefined
    const { [COMPOSITION_STYLE_REQUEST_PROP]: _compositionStyleRequest, ...componentProps } = props
    const renderBundle =
      compositionStyleRequest && componentProps.asChild === true
        ? {
            ...bundle,
            runtime: { ...bundle.runtime, resolveClasses: compositionStyleRequest.resolveClasses },
          }
        : bundle

    // Keep current on every render so the stable callback ref can always read the latest
    // props via getProps() without re-registering.
    const propsRef = useRef(componentProps)
    propsRef.current = componentProps
    const cleanupRef = useRef<(() => void) | undefined>(undefined)

    // `onElement` originates from the options object closed over by createContractComponent,
    // not from props, so it's static for the component's lifetime — this callback intentionally
    // stays stable across renders. Preact only re-invokes a stable callback ref when the
    // underlying element instance changes (mount, replacement, or unmount), so onElement is
    // registered once for each mounted element, regardless of how many times Component re-renders.
    const onElementRef = useCallback((el: unknown) => {
      if (!onElement) return
      if (el) {
        // Defensive: Preact currently always calls this ref with `null` before a replacement
        // element, but that ordering isn't part of the formal callback-ref contract — clean up
        // any existing registration first so a hypothetical el→el invocation can't leak one.
        // Cleared right after invoking, not left to be overwritten below, so a subsequent
        // `onElement(...)` throw doesn't leave a stale, already-run cleanup to fire again on
        // unmount. Mirrors `@praxis-kit/react`.
        cleanupRef.current?.()
        cleanupRef.current = undefined
        // The real element's actual tag is only known at runtime; `onElement`'s parameter type
        // narrows that per-component via `TDefault`/`allowed`, which the DOM ref API itself
        // can't express — see `FactoryOptions.onElement`.
        cleanupRef.current =
          onElement(
            el as Parameters<NonNullable<typeof onElement>>[0],
            () => propsRef.current as unknown as Readonly<Props>,
          ) ?? undefined
      } else {
        cleanupRef.current?.()
        cleanupRef.current = undefined
      }
    }, [])

    const mergedRef = onElement ? mergeRefs(ref, onElementRef) : ref

    // See `@praxis-kit/react`'s identical block for the full explanation — `compose` makes this
    // component always render `asChild` into `compose.with` unless the consumer already took
    // explicit control via their own `asChild`. `compose.allProps` additionally spreads this
    // component's own raw props onto `with` (before the `asChild`/`ref`/`children` overrides, so
    // those three always win) — opt-in.
    if (
      compose?.with !== undefined &&
      componentProps.asChild === undefined &&
      !isFunction(componentProps.render)
    ) {
      const innerElement = render({
        ...(compositionClassResolver
          ? { ...bundle, runtime: { ...bundle.runtime, resolveClasses: (): undefined => {} } }
          : bundle),
        props: componentProps,
        ref: null,
      })
      return h(compose.with as ComponentType<UnknownProps>, {
        ...compose.defaults,
        ...(compose.allProps && componentProps),
        ...(compositionClassResolver
          ? {
              [COMPOSITION_STYLE_REQUEST_PROP]: {
                resolveClasses: (
                  tag: unknown,
                  partnerProps: AnyRecord,
                  partnerClassName?: string | string[],
                  partnerRecipe?: string,
                ) =>
                  compositionClassResolver(
                    tag,
                    composeStyleProps(
                      partnerProps,
                      componentProps,
                      bundle.runtime.options,
                      compose.defaults,
                    ),
                    mergeCompositionClassNames(
                      partnerClassName,
                      componentProps.className as string | string[] | undefined,
                    ),
                    isString(componentProps.recipe) ? componentProps.recipe : partnerRecipe,
                  ),
              },
            }
          : {}),
        asChild: true,
        ref: mergedRef,
        children: innerElement,
      })
    }

    return render({ ...renderBundle, props: componentProps, ref: mergedRef })
  })

  applyDisplayName(Component, options.name)
  const { defaultTag } = bundle.runtime.options
  const assembled = attachCompositionStyleMetadata(
    finalizeComponent(
      Component,
      isString(defaultTag) ? defaultTag : undefined,
      options.subComponents,
    ),
    bundle.runtime.options,
  )

  type G = PolymorphicGenerics<
    TDefault,
    MergeRecords<Props, ExtractPluginProps<TPlugin>>,
    Variants,
    TPreset
  >
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  // MergeRecords is a conditional type. While these generics are still open, TypeScript cannot
  // prove that the assembled value satisfies the same conditional expression used by the
  // declared return type. Once the generics are instantiated at a call site, the conditional
  // simplifies correctly. The invariant above validates the runtime shape; this assertion
  // bridges the gap in the compiler's type reasoning. Also where `__contract`'s `C` is attached —
  // type-only, matching `__generics`: `assembled` never actually gains a `__contract` property at
  // runtime, only in the type this assertion claims.
  return assembled as unknown as MergeRecords<PolymorphicComponent<G, C>, TSubComponents>
}
