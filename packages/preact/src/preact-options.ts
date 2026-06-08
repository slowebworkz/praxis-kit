import type {
  AnyRecord,
  ElementType as CoreElementType,
  EmptyRecord,
  FactoryOptions,
  PresetMap,
  VariantMap,
} from '@praxis-kit/core'
import type { SlotComponent, UnknownProps } from './types/primitives'

export type PreactFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
  /** Component used to render the asChild slot. Defaults to the built-in Slot. */
  slotComponent?: SlotComponent
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
