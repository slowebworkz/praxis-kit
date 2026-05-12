import type {
  AnyRecord,
  ElementType,
  FactoryOptions,
  PresetMap,
  ResolvedFactoryOptions,
  VariantMap,
} from '../types'

export function resolveFactoryOptions<
  TDefault extends ElementType,
  Props extends AnyRecord,
  V extends Readonly<VariantMap>,
  TPreset extends PresetMap<V>,
>(
  options: FactoryOptions<TDefault, Props, V, TPreset> = {},
): Readonly<ResolvedFactoryOptions<TDefault, Props, V, TPreset>> {
  return Object.freeze({
    defaultTag: options.defaultTag ?? 'div',
    strict: options.strict ?? false,
    ...(options.baseClassName !== undefined && { baseClassName: options.baseClassName }),
    ...(options.defaultProps !== undefined && { defaultProps: options.defaultProps }),
    ...(options.tagMap !== undefined && { tagMap: options.tagMap }),
    ...(options.presetMap !== undefined && { presetMap: options.presetMap }),
    ...(options.variants !== undefined && { variants: options.variants }),
    ...(options.defaultVariants !== undefined && { defaultVariants: options.defaultVariants }),
    ...(options.compoundVariants !== undefined && { compoundVariants: options.compoundVariants }),
    ...(options.displayName !== undefined && { displayName: options.displayName }),
  })
}
