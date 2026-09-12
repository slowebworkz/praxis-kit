import { computed, defineComponent } from 'vue'
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
import { finalizeComponent, invariant } from '@praxis-kit/adapter-utils'
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
  const { onElement } = options

  const Component = defineComponent({
    // normalizeOptions always supplies `name`, so displayName is always defined here —
    // the fallback only satisfies the type, which allows it to be absent in general.
    name: bundle.runtime.options.displayName ?? 'PolymorphicComponent',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // Cache derived render state using Vue's dependency tracking so prop resolution only
      // recomputes when attrs change.
      const state = computed(() =>
        prepareRenderState(bundle.runtime, attrs as KnownProps, bundle.filterProps),
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

      return () => render({ ...bundle, state: state.value, slots, elementRef: onElementRef })
    },
  })

  applyDisplayName(Component, options.name)
  const assembled = finalizeComponent(
    Component,
    bundle.runtime.options.defaultTag,
    options.subComponents,
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
