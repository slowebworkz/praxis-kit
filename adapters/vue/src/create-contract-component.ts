import { computed, defineComponent, h } from 'vue'
import type { Component as VueComponent } from 'vue'
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
  mergeCompositionClassNames,
  COMPOSITION_STYLE_REQUEST_PROP,
  isCompositionStyleRequest,
  finalizeComponent,
  invariant,
} from '@praxis-kit/adapter-utils'
import { isDefined, isString } from '@praxis-kit/guards'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { isPolymorphicComponent } from './is-polymorphic-component'
import { prepareRenderState, render } from './render'
import { isVueFactoryOptions } from './to-vue-factory-options'
import type { KnownProps, PolymorphicComponent, UnknownProps } from './types'
import type { VueFactoryOptions } from './vue-options'

/**
 * Creates a polymorphic Vue component with praxis-kit contracts applied.
 *
 * ```ts
 * const Button = createContractComponent({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: {
 *     base: 'btn',
 *     variants: { intent: { primary: 'btn--primary', ghost: 'btn--ghost' } },
 *     defaults: { intent: 'primary' },
 *   },
 * })
 * ```
 *
 * ```vue
 * <Button intent="ghost" as="a" href="/home">Home</Button>
 * ```
 *
 * Pass `subComponents` to attach named sub-components (`Card.Header`) and `onElement` to run
 * setup once the real DOM element exists — both purely additive on top of the generated
 * component.
 *
 * `TDefault`/`Props`/`Variants`/`TPreset`/`TPlugin` are each `ContractXOf<C>`-derived *defaults*
 * on this function's own type parameter list, mirroring `@praxis-kit/react`'s identical fix — see
 * that adapter's own doc comment for why (computed as function type-parameter defaults, not inline
 * body computations, which doesn't resolve for a still-abstract `C`). No `TAllowed` here, matching
 * this adapter's pre-refactor behavior — Vue never threaded it as its own generic.
 */
export function createContractComponent<
  C extends VueFactoryOptions,
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
  invariant(isVueFactoryOptions(options), 'options is not a valid VueFactoryOptions object')
  /**
   * `C` and `TDefault`/`Props`/`Variants`/`TPreset` are formally independent type parameters to
   * the checker — see `@praxis-kit/react`'s identical comment for the full explanation. The
   * `invariant` above is what actually guarantees `options` is `VueFactoryOptions` shaped; this
   * assertion bridges the gap in the compiler's reasoning.
   */
  const bundle = buildRuntime(
    options as unknown as VueFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>,
  )
  diagnoseIncompleteComposition(options.compose, options.name, bundle.runtime.options.diagnostics)
  const { onElement, compose } = options
  const compositionClassResolver = bundle.compositionClassResolver

  const Component = defineComponent({
    // normalizeOptions always supplies `name`, so displayName is always defined here —
    // the fallback only satisfies the type, which allows it to be absent in general.
    name: bundle.runtime.options.displayName ?? 'PolymorphicComponent',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // The resolver request is an internal bridge between generated components, never a
      // consumer prop and never something that should reach normalized or DOM-bound props.
      const cleanAttrs = computed(() => {
        const { [COMPOSITION_STYLE_REQUEST_PROP]: _request, ...rest } = attrs
        return rest as KnownProps
      })
      const compositionStyleRequest = computed(() => {
        const value = attrs[COMPOSITION_STYLE_REQUEST_PROP]
        return isCompositionStyleRequest(value) ? value : undefined
      })
      const renderRuntime = computed(() => {
        const request = compositionStyleRequest.value
        if (request && attrs['asChild'] === true) {
          return { ...bundle.runtime, resolveClasses: request.resolveClasses }
        }
        if (
          compositionClassResolver &&
          isDefined(compose?.with) &&
          attrs['asChild'] === undefined
        ) {
          // The primary is represented by the combined resolver on `compose.with`; its child
          // vnode must not contribute a second, independently-resolved primary class string.
          return { ...bundle.runtime, resolveClasses: (): undefined => {} }
        }
        return bundle.runtime
      })
      // Cache derived render state using Vue's dependency tracking so prop resolution only
      // recomputes when attrs change.
      const state = computed(() =>
        prepareRenderState(renderRuntime.value, cleanAttrs.value, bundle.filterProps),
      )

      // setup() runs once per component instance, so this callback remains stable across
      // every render.
      //
      // Vue invokes function refs with the element on mount and `null` on unmount, matching
      // the callback-ref contract used by the React and Preact adapters. `attrs` is reactive,
      // so getProps() always observes current values. Vue re-invokes a vnode's function-ref on
      // every patch of that vnode, not just genuine mount/unmount — track the currently-bound
      // element so a same-element re-invocation (e.g. from an unrelated prop change) is a no-op
      // rather than tearing down and re-registering.
      let cleanup: (() => void) | undefined
      let boundElement: Element | null = null
      const onElementRef = onElement
        ? (element: Element | null) => {
            if (element === boundElement) return
            if (boundElement) {
              cleanup?.()
              cleanup = undefined
            }
            boundElement = element
            if (element) {
              // The real element's actual tag is only known at runtime; `onElement`'s parameter
              // type narrows that per-component via `TDefault`/`allowed`, which Vue's function-ref
              // contract itself can't express — see `FactoryOptions.onElement`.
              cleanup =
                onElement(
                  element as Parameters<NonNullable<typeof onElement>>[0],
                  () => attrs as unknown as Readonly<Props>,
                ) ?? undefined
            }
          }
        : undefined

      return () => {
        const innerVNode = render({
          ...bundle,
          runtime: renderRuntime.value,
          state: state.value,
          slots,
          elementRef: onElementRef,
        })

        // `compose` makes this component always render `asChild` into `compose.with`, as if the
        // consumer had hand-written `<With asChild><ThisComponent v-bind="attrs" /></With>` — but
        // only when the consumer didn't already take explicit control via their own `asChild`.
        // `innerVNode` is this component's own normal-mode output (computed above exactly as it
        // already is today); `with` is then rendered as an ordinary Vue component with
        // `asChild: true`, so `with`'s own generated component runs its own `render()` from here,
        // exactly as it already does for a hand-written nested `asChild` call. `compose.allProps`
        // additionally spreads this component's own raw `attrs` onto `with` (before the
        // `asChild` override, so that always wins) — opt-in.
        if (compose?.with !== undefined && attrs['asChild'] === undefined) {
          return h(
            compose.with as VueComponent,
            {
              ...compose.defaults,
              ...(compose.allProps ? cleanAttrs.value : undefined),
              ...(compositionClassResolver
                ? {
                    [COMPOSITION_STYLE_REQUEST_PROP]: {
                      resolveClasses: (
                        tag: unknown,
                        partnerProps: AnyRecord,
                        partnerClassName?: string | string[],
                        partnerRecipe?: string,
                      ) => {
                        const recipe = cleanAttrs.value['recipe']
                        return compositionClassResolver(
                          tag,
                          composeStyleProps(
                            partnerProps,
                            cleanAttrs.value,
                            bundle.runtime.options,
                            compose.defaults,
                            compositionClassResolver.partner,
                          ),
                          mergeCompositionClassNames(
                            partnerClassName,
                            cleanAttrs.value['class'] as string | string[] | undefined,
                          ),
                          isString(recipe) ? recipe : partnerRecipe,
                        )
                      },
                    },
                  }
                : {}),
              asChild: true,
            },
            { default: () => innerVNode },
          )
        }

        return innerVNode
      }
    },
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
