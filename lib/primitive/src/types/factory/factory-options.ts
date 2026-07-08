import type { AnyRecord, ElementType, EmptyRecord, IntrinsicProps } from '../primitives'
import type { RecipeMap, VariantMap } from '../variants'
import type { AnyClassPluginFactory } from '../class'
import type { EnforcementOptions } from './enforcement-options'
import type { StylingOptions } from './styling-options'
import type { PropNormalizer } from './prop-normalizer'

export type { PropNormalizer }

// method-signature form gives bivariant assignability so NormalizeFn<Props> flows across adapter boundaries
export type NormalizeFn<Props extends AnyRecord = AnyRecord> = {
  normalize(props: Readonly<Props & IntrinsicProps>): Props & IntrinsicProps
}['normalize']

export type AnyFactoryOptions = FactoryOptions<
  ElementType,
  AnyRecord,
  VariantMap,
  RecipeMap<VariantMap>,
  AnyClassPluginFactory
>

export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<V> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
> = {
  readonly tag?: TDefault
  readonly name?: string
  readonly defaults?: Partial<NoInfer<Props>>
  readonly normalize?: NormalizeFn<NoInfer<Props>>
  readonly styling?: StylingOptions<V, TPreset, TPlugin>
  readonly enforcement?: EnforcementOptions<TAllowed>
}
