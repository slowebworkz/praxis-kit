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
  // Conditional spreads rather than `key: value | undefined` satisfy exactOptionalPropertyTypes:
  // { key: undefined } and {} are distinct shapes under that flag.
  return Object.freeze({
    defaultTag: (options.defaultTag ?? 'div') as TDefault,
    strict: options.strict ?? false,
    variantKeys: new Set(Object.keys(options.variants ?? {})) as ReadonlySet<string>,
    ...(options.baseClassName !== undefined && { baseClassName: options.baseClassName }),
    ...(options.defaultProps !== undefined && { defaultProps: options.defaultProps }),
    ...(options.tagMap !== undefined && { tagMap: options.tagMap }),
    ...(options.presetMap !== undefined && { presetMap: options.presetMap }),
    ...(options.variants !== undefined && { variants: options.variants }),
    ...(options.defaultVariants !== undefined && { defaultVariants: options.defaultVariants }),
    ...(options.compoundVariants !== undefined && { compoundVariants: options.compoundVariants }),
    ...(options.displayName !== undefined && { displayName: options.displayName }),
    ...(options.childRules !== undefined && { childRules: options.childRules }),
  })
}
