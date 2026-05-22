import type {
  AnyRecord,
  ElementType as CoreElementType,
  FactoryOptions,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import type { UnknownProps, SlotComponent } from './types'

export type PreactFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
  TPluginProps extends AnyRecord = Record<never, never>,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
  /** Component used to render the asChild slot. Defaults to the built-in Slot. */
  slotComponent?: SlotComponent
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
