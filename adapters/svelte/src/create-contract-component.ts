import type {
  AnyRecord,
  ContractGenericsOf,
  ContractPresetOf,
  ContractPropsOf,
  ContractTagOf,
  ContractVariantsOf,
  ElementType,
  EmptyRecord,
  MergeRecords,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { assembleCompoundComponent } from '@praxis-kit/adapter-utils'
import { buildRuntime } from './build-runtime'
import type { SvelteFactoryOptions } from './svelte-options'
import type { BuiltRuntime } from './types/built-runtime'
import type { UnknownProps } from './types'

/**
 * Creates a praxis-kit contract bundle for use with Svelte's `<Polymorphic>` component.
 *
 * Unlike the other adapters, this returns a plain bundle object rather than a component —
 * Svelte components must come from `.svelte` files, a compile-time constraint — so the bundle
 * is passed as the `bundle` prop:
 *
 * ```ts
 * // button.ts
 * export const buttonBundle = createContractComponent({
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
 * ```svelte
 * <!-- Button.svelte -->
 * <script lang="ts">
 *   import Polymorphic from 'praxis-kit/svelte/Polymorphic.svelte'
 *   import { buttonBundle } from './button'
 * </script>
 * <Polymorphic bundle={buttonBundle} intent="ghost" as="a" href="/home">Home</Polymorphic>
 * ```
 *
 * Pass `subComponents` to attach named sub-components (`Card.Header`) — `Object.assign` works
 * the same way on a plain bundle as on a component function/class, so `Card.Header` is itself
 * just another bundle, passed to its own `<Polymorphic bundle={Card.Header}>`. Pass `onElement`
 * to run setup once the real DOM element exists.
 *
 * `TDefault`/`Props`/`Variants`/`TPreset` are each `ContractXOf<C>`-derived *defaults* on this
 * function's own type parameter list, mirroring every other adapter's identical fix — see
 * `@praxis-kit/react`'s own doc comment for why. The biggest reduction of any adapter (7 generics
 * down to `C` + `TSubComponents`): the old `TOptions extends WithChildRules` parameter — needed by
 * `BuiltRuntime<G, TOptions>` to conditionally include `childrenEvaluator` based on the *literal*
 * `enforcement.children`/`exclusiveChildren`/`allowText` shape — was never anything but a
 * self-referential reconstruction of the same options type `C` now *is* directly, so it's simply
 * `C` itself below, not a separate parameter.
 */
export function createContractComponent<
  C extends SvelteFactoryOptions,
  TDefault extends ElementType = ContractTagOf<C>,
  Props extends UnknownProps = ContractPropsOf<C>,
  Variants extends Readonly<VariantMap> = ContractVariantsOf<C>,
  TPreset extends RecipeMap<VariantMap> = ContractPresetOf<C>,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: C & { readonly subComponents?: TSubComponents },
): MergeRecords<BuiltRuntime<ContractGenericsOf<C>, C>, TSubComponents> {
  // `options` (a single, formally independent type parameter `C`) no longer sufficiently
  // overlaps with the reconstructed `SvelteFactoryOptions<...> & C` for a direct cast the way the
  // old, separately-threaded generics did — see `@praxis-kit/react`'s identical comment. `C` is
  // reused as `buildRuntime`'s own `TOptions` argument (in place of the old, separate `TOptions`
  // parameter) since `C` already *is* the literal options type `WithChildRules`-shaped inference
  // needs.
  const bundle = buildRuntime(
    options as unknown as SvelteFactoryOptions<TDefault, Props, Variants, TPreset> & C,
  ) as unknown as BuiltRuntime<ContractGenericsOf<C>, C>

  return assembleCompoundComponent(bundle, options.subComponents)
}
