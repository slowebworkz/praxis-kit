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
 * Options accepted by createContractComponent in the Lit adapter.
 *
 * Extends FactoryOptions with one Lit-specific field:
 * - filterProps: determines whether a prop should be omitted before it is
 *   reflected as a DOM attribute. Variant keys and plugin-owned keys are
 *   always omitted; this predicate extends that set.
 *
 * Note: this adapter targets Light DOM composition only. Shadow DOM slot
 * protocol is intentionally out of scope.
 *
 * Every generic parameter has a default (widened to that parameter's own *bound*, matching
 * a wide-bound, type-erased philosophy, not `FactoryOptions`'s own narrower `EmptyRecord`-style
 * defaults) so `LitFactoryOptions` can be used bare, as `createContractComponent`'s single
 * `C extends LitFactoryOptions` constraint — see `ReactFactoryOptions`'s identical fix for the
 * same reason.
 */
export type LitFactoryOptions<
  TDefault extends ElementType = ElementType,
  TProps extends AnyRecord = AnyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<TVariants> = RecipeMap<TVariants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPlugin> & {
  readonly filterProps?: FilterPredicate
}
