import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
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
 */
export type WebFactoryOptions<
  TDefault extends ElementType = ElementType,
  TProps extends AnyRecord = EmptyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<TVariants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPlugin> & {
  readonly filterProps?: FilterPredicate
}
