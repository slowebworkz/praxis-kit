import type { AnyRecord, ElementType, EmptyRecord } from '../primitives'
import type { PresetMap, VariantMap } from '../variants'
import type { EnforcementOptions } from './enforcement-options'
import type { StylingOptions } from './styling-options'

export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<V> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = {
  readonly tag?: TDefault
  readonly name?: string
  readonly defaults?: Partial<NoInfer<Props>>
  readonly styling?: StylingOptions<V, TPreset, TPluginProps>
  readonly enforcement?: EnforcementOptions
}
