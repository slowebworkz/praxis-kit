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
  const { styling, enforcement } = options
  // Conditional spreads rather than `key: value | undefined` satisfy exactOptionalPropertyTypes:
  // { key: undefined } and {} are distinct shapes under that flag.
  return Object.freeze({
    defaultTag: (options.tag ?? 'div') as TDefault,
    strict: enforcement?.strict ?? false,
    variantKeys: new Set(Object.keys(styling?.variants ?? {})) as ReadonlySet<string>,
    ...(options.name !== undefined && { displayName: options.name }),
    ...(options.defaults !== undefined && { defaultProps: options.defaults }),
    ...(styling?.base !== undefined && { baseClassName: styling.base }),
    ...(styling?.tags !== undefined && { tagMap: styling.tags }),
    ...(styling?.presets !== undefined && { presetMap: styling.presets }),
    ...(styling?.variants !== undefined && { variants: styling.variants }),
    ...(styling?.defaults !== undefined && { defaultVariants: styling.defaults }),
    ...(styling?.compounds !== undefined && { compoundVariants: styling.compounds }),
    ...(enforcement?.aria !== undefined && { ariaRules: enforcement.aria }),
    ...(enforcement?.children !== undefined && { childRules: enforcement.children }),
  })
}
