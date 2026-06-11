import type { AnyRecord, ElementType, EmptyRecord, IntrinsicProps } from '../primitives'
import type { PresetMap, VariantMap } from '../variants'
import type { EnforcementOptions } from './enforcement-options'
import type { StylingOptions } from './styling-options'

// Input is always Readonly<AnyRecord & IntrinsicProps> so NormalizeFn is
// invariant-safe across all callsites — consumers narrow the type via explicit
// parameter annotations or destructuring rather than relying on inference.
export type NormalizeFn = (
  props: Readonly<AnyRecord & IntrinsicProps>,
) => AnyRecord & IntrinsicProps

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
  readonly normalize?: NormalizeFn
  readonly styling?: StylingOptions<V, TPreset, TPluginProps>
  readonly enforcement?: EnforcementOptions<TAllowed>
}
