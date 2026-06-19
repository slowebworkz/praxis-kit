import type {
  AnyRecord,
  ElementType as CoreElementType,
  EmptyRecord,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { UnknownProps } from './types/primitives'

export type SvelteFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
