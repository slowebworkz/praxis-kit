import type {
  AnyClassPluginFactory,
  AnyRecord,
  ContractAllowedOf,
  ContractPluginOf,
  ContractPresetOf,
  ContractPropsOf,
  ContractTagOf,
  ContractVariantsOf,
  ElementForTag,
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
  filterOwnedProps,
  mergeCompositionClassNames,
  COMPOSITION_STYLE_REQUEST_PROP,
  isCompositionStyleRequest,
  finalizeComponent,
  invariant,
} from '@praxis-kit/adapter-utils'
import { isFunction, isString } from '@praxis-kit/guards'
import type { ComponentType, ReactElement, Ref } from 'react'
import { createElement, forwardRef, useCallback, useRef } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName, isReactFactoryOptions, mergeRefs, render } from '../shared'
import { buildRuntime } from './build-runtime'

/**
 * Creates a polymorphic React component with praxis-kit contracts applied, for React 18 and
 * earlier (use `praxis-kit/react` instead on React 19, which accepts `ref` as a plain prop).
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
 * Returns a `forwardRef` component — `ref` is forwarded to the rendered host element the same
 * way it works in `praxis-kit/react`. Pass `subComponents` to attach named sub-components
 * (`Card.Header`) and `onElement` to run setup once the real DOM element exists.
 *
 * `TDefault`/`Props`/`Variants`/`TPreset`/`TPlugin`/`TAllowed` are each `ContractXOf<C>`-derived
 * *defaults* on this function's own type parameter list, mirroring `current/create-contract-component.ts`
 * exactly — see that file's own doc comment for why (computed as function type-parameter defaults,
 * not inline body computations, which doesn't resolve for a still-abstract `C`).
 */
export function createContractComponent<
  C extends ReactFactoryOptions,
  TDefault extends ElementType = ContractTagOf<C>,
  Props extends UnknownProps = ContractPropsOf<C>,
  Variants extends Readonly<VariantMap> = ContractVariantsOf<C>,
  TPreset extends RecipeMap<VariantMap> = ContractPresetOf<C>,
  TPlugin extends AnyClassPluginFactory = ContractPluginOf<C>,
  TAllowed extends ElementType = ContractAllowedOf<C>,
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
      TPreset,
      TAllowed
    >,
    C
  >,
  TSubComponents
> {
  // Confirmed pre-existing gap (found while migrating `current` through this same refactor):
  // this check was missing here even before this signature collapse. Added to match `current`,
  // not required by the refactor itself, but low-risk and worth closing alongside.
  invariant(isReactFactoryOptions(options), 'options is not a valid ReactFactoryOptions object')
  /**
   * `C` and `TDefault`/`Props`/`Variants`/`TPreset`/`TAllowed` are formally independent type
   * parameters to the checker — see `current/create-contract-component.ts`'s identical comment
   * for the full explanation. The `invariant` above is what actually guarantees `options` is
   * `ReactFactoryOptions` shaped; this assertion bridges the gap in the compiler's reasoning.
   */
  const bundle = buildRuntime(
    options as unknown as ReactFactoryOptions<
      TDefault,
      Props,
      Variants,
      TPreset,
      AnyClassPluginFactory,
      TAllowed
    >,
  )
  diagnoseIncompleteComposition(options.compose, options.name, bundle.runtime.options.diagnostics)
  const { onElement, compose } = options
  const compositionClassResolver = bundle.compositionClassResolver

  // React 18: ref is not available as a plain prop — forwardRef is required.
  const Component = forwardRef<unknown, UnknownProps>(function Component(
    props: UnknownProps,
    ref: Ref<unknown> | null,
  ): ReactElement {
    // Keep current on every render so the stable callback ref can always read the latest
    // props via getProps() without re-registering.
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
    const propsRef = useRef(componentProps)
    propsRef.current = componentProps
    const cleanupRef = useRef<(() => void) | undefined>(undefined)

    // `onElement` originates from the options object closed over by createContractComponent,
    // not from props, so it's static for the component's lifetime — this callback intentionally
    // stays stable across renders. React only re-invokes a stable callback ref when the
    // underlying element instance changes (mount, replacement, or unmount), so onElement is
    // registered once for each mounted element, regardless of how many times Component re-renders.
    const onElementRef = useCallback((el: Element | null) => {
      if (!onElement) return
      if (el) {
        // Defensive: React currently always calls this ref with `null` before a replacement
        // element, but that ordering isn't part of the formal callback-ref contract — clean up
        // any existing registration first so a hypothetical el→el invocation can't leak one.
        // Cleared right after invoking, not left to be overwritten below, so a subsequent
        // `onElement(...)` throw doesn't leave a stale, already-invoked cleanup in place to be
        // run a second time on unmount. (Mirrors `current/create-contract-component.ts`.)
        cleanupRef.current?.()
        cleanupRef.current = undefined
        // The real element's actual tag is only known at runtime (`tag` default or a consumer's
        // `as` override); `onElement`'s parameter type narrows that per-component via `TDefault`/
        // `TAllowed`, which the DOM ref API itself can't express — see `FactoryOptions.onElement`.
        cleanupRef.current =
          onElement(
            el as ElementForTag<TDefault | TAllowed>,
            () => propsRef.current as unknown as Readonly<Props>,
          ) ?? undefined
      } else {
        cleanupRef.current?.()
        cleanupRef.current = undefined
      }
    }, [])

    const mergedRef = onElement ? mergeRefs(ref, onElementRef) : ref

    // See `current/create-contract-component.ts`'s identical block for the full explanation —
    // `compose` makes this component always render `asChild` into `compose.with` unless the
    // consumer already took explicit control via their own `asChild`/`render`. Composition
    // defaults are spread first; `compose.allProps` additionally spreads this component's own
    // raw props afterward, except `as`, which the inner render has already consumed. Forwarded
    // values override defaults; the `asChild`/`ref`/`children` overrides remain last and win.
    // Combined styling resolution is independent of `allProps`, which controls raw prop forwarding.
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
      return createElement(compose.with as ComponentType<UnknownProps>, {
        ...filterOwnedProps(compose.defaults, bundle.ownedKeys, ['as']),
        ...(compose.allProps ? filterOwnedProps(componentProps, bundle.ownedKeys, ['as']) : undefined),
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
                      compositionClassResolver.partner,
                      compositionClassResolver.ownedKeys,
                    ),
                    mergeCompositionClassNames(
                      partnerClassName,
                      componentProps.className as string | string[] | undefined,
                    ),
                    isString(componentProps.recipe) ? componentProps.recipe : partnerRecipe,
                  ),
              },
            }
          : undefined),
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
      typeof defaultTag === 'string' ? defaultTag : undefined,
      options.subComponents,
    ),
    bundle.runtime.options,
    options.styling?.plugin,
  )

  type G = PolymorphicGenerics<
    TDefault,
    MergeRecords<Props, ExtractPluginProps<TPlugin>>,
    Variants,
    TPreset,
    TAllowed
  >

  return assembled as unknown as MergeRecords<PolymorphicComponent<G, C>, TSubComponents>
}
