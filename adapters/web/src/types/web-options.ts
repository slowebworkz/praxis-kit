import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { FilterPredicate } from '@praxis-kit/adapter-utils'

/**
 * Options accepted by createContractComponent in the web adapter.
 *
 * Identical shape to LitFactoryOptions — a plain HTMLElement subclass with
 * no framework dependency. Light DOM only; Shadow DOM is out of scope.
 *
 * Every generic parameter has a default (widened to that parameter's own *bound*, matching
 * `AnyFactoryOptions`'s philosophy, not `FactoryOptions`'s own narrower `EmptyRecord`-style
 * defaults) so `WebFactoryOptions` can be used bare, as `createContractComponent`'s single
 * `C extends WebFactoryOptions` constraint — see `ReactFactoryOptions`'s identical fix for the
 * same reason.
 */
export type WebFactoryOptions<
  TDefault extends ElementType = ElementType,
  TProps extends AnyRecord = AnyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<TVariants> = RecipeMap<TVariants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPlugin> & {
  readonly filterProps?: FilterPredicate
}
