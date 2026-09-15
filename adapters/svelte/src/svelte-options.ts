import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType as CoreElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { UnknownProps } from './types/primitives'

/**
 * Every generic parameter has a default (widened to that parameter's own *bound*, matching
 * a wide-bound, type-erased philosophy, not `FactoryOptions`'s own narrower `EmptyRecord`-style
 * defaults) so `SvelteFactoryOptions` can be used bare, as `createContractComponent`'s single
 * `C extends SvelteFactoryOptions` constraint — see `ReactFactoryOptions`'s identical fix for the
 * same reason. Unlike every other adapter's `*FactoryOptions`, none of these five had a default at
 * all before this — `createContractComponent`'s old 7-generic signature always supplied them
 * itself, so nothing here needed to compile bare until Phase 2 of the `defineContract` refactor.
 */
export type SvelteFactoryOptions<
  TDefault extends CoreElementType = CoreElementType,
  Props extends UnknownProps = AnyRecord,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
