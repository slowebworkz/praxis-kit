import type { AnyRecord, ElementType, EmptyRecord, IntrinsicProps } from '../primitives'
import type { PresetMap, VariantMap } from '../variants'
import type { EnforcementOptions } from './enforcement-options'
import type { StylingOptions } from './styling-options'

// Method signature extraction preserves TypeScript's bivariant method treatment,
// making NormalizeFn<Props> assignable to NormalizeFn<AnyRecord> across adapter
// boundaries while keeping props fully typed for consumers.
export type NormalizeFn<Props extends AnyRecord = AnyRecord> = {
  normalize(props: Readonly<Props & IntrinsicProps>): Props & IntrinsicProps
}['normalize']

export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<V> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
  TAllowed extends ElementType = ElementType,
> = {
  readonly tag?: TDefault
  readonly name?: string
  readonly defaults?: Partial<NoInfer<Props>>
  readonly normalize?: NormalizeFn<NoInfer<Props>>
  readonly styling?: StylingOptions<V, TPreset, TPluginProps>
  readonly enforcement?: EnforcementOptions<TAllowed>
}
