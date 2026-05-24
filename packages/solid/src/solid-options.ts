import type {
  AnyRecord,
  ElementType as CoreElementType,
  FactoryOptions,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import type { UnknownProps } from './types/primitives'

export type SolidFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
  TPluginProps extends AnyRecord = Record<never, never>,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
