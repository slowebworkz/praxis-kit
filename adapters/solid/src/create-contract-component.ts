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
import { mergeProps, onCleanup } from 'solid-js'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { isPolymorphicComponent } from './is-polymorphic-component'
import { render } from './render'
import { isSolidFactoryOptions } from './to-solid-factory-options'
import type { SolidFactoryOptions } from './solid-options'
import type { KnownProps, PolymorphicComponent, SolidElement, UnknownProps } from './types'

/**
 * Creates a polymorphic Solid component with praxis-kit contracts applied.
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
 * `ref` is forwarded as an ordinary Solid ref callback. Pass `subComponents` to attach named
 * sub-components (`Card.Header`) and `onElement` to run setup once the real DOM element exists.
 *
 * `TDefault`/`Props`/`Variants`/`TPreset`/`TPlugin` are each `ContractXOf<C>`-derived *defaults*
 * on this function's own type parameter list, mirroring `@praxis-kit/react`'s identical fix — see
 * that adapter's own doc comment for why (computed as function type-parameter defaults, not inline
 * body computations, which doesn't resolve for a still-abstract `C`). No `TAllowed` here, matching
 * this adapter's pre-refactor behavior — Solid never threaded it as its own generic.
 */
export function createContractComponent<
  C extends SolidFactoryOptions,
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
  invariant(isSolidFactoryOptions(options), 'options is not a valid SolidFactoryOptions object')
  // This adapter's buildRuntime can't accept `options` as-is: its signature is
  // `SolidFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions`,
  // defaulting TPlugin itself and inferring a fresh TOptions — a specific
  // TPlugin instantiation isn't assignable to that default under
  // exactOptionalPropertyTypes (a known, separately-tracked plugin/styling
  // generic invariance; see the NormalizeFn bivariance note elsewhere in this
  // codebase). TPlugin is erased at runtime regardless, so no guard could
  // ever check this gap — it needs an assertion the same way buildRuntime's
  // TPlugin elision does in every other adapter. `as unknown as`, not the
  // original narrower `as`, since `C` (a single, formally independent type
  // parameter — see `@praxis-kit/react`'s identical comment) no longer
  // sufficiently overlaps with the reconstructed `SolidFactoryOptions<...>`
  // for a direct cast the way the old, separately-threaded generics did.
  const bundle = buildRuntime(
    options as unknown as SolidFactoryOptions<TDefault, Props, Variants, TPreset>,
  )
  const { onElement } = options

  const Component = (props: UnknownProps): SolidElement => {
    // Solid ref callbacks fire once, at element creation — a natural fit for "mount". They
    // don't fire again with null on unmount (unlike React), so cleanup is registered via
    // Solid's own onCleanup instead of a second ref invocation.
    const propsWithRef = onElement
      ? mergeProps(props, {
          get ref() {
            const consumerRef = (props as { ref?: unknown }).ref
            return (el: Element) => {
              if (typeof consumerRef === 'function') (consumerRef as (e: Element) => void)(el)
              // The real element's actual tag is only known at runtime; `onElement`'s parameter
              // type narrows that per-component via `TDefault`/`allowed`, which Solid's ref
              // contract itself can't express — see `FactoryOptions.onElement`.
              const cleanup = onElement(
                el as Parameters<NonNullable<typeof onElement>>[0],
                () => props as unknown as Readonly<Props>,
              )
              if (cleanup) onCleanup(cleanup)
            }
          },
        })
      : props

    return render({
      ...bundle,
      props: propsWithRef as KnownProps,
    })
  }

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
