import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PresetMap,
  ResolvedFactoryOptions,
  VariantMap,
} from '../types'

const EMPTY_VARIANT_KEYS: ReadonlySet<string> = new Set()

function whenDefined<K extends PropertyKey, V>(
  key: K,
  value: V | undefined,
): Record<K, V> | EmptyRecord {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>)
}

export function resolveFactoryOptions<
  TDefault extends ElementType,
  Props extends AnyRecord,
  V extends Readonly<VariantMap>,
  TPreset extends PresetMap<V>,
>(
  options: FactoryOptions<TDefault, Props, V, TPreset> = {},
): Readonly<ResolvedFactoryOptions<TDefault, Props, V, TPreset>> {
  const { styling, enforcement } = options

  const variantKeys: ReadonlySet<string> =
    styling?.variants === undefined ? EMPTY_VARIANT_KEYS : new Set(Object.keys(styling.variants))

  // whenDefined spreads satisfy exactOptionalPropertyTypes: { key: undefined } and {} are distinct.
  return Object.freeze({
    defaultTag: (options.tag ?? 'div') as TDefault,
    strict: enforcement?.strict ?? false,
    variantKeys,
    ...whenDefined('displayName', options.name),
    ...whenDefined('defaultProps', options.defaults),
    ...whenDefined('baseClassName', styling?.base),
    ...whenDefined('tagMap', styling?.tags),
    ...whenDefined('presetMap', styling?.presets),
    ...whenDefined('variants', styling?.variants),
    ...whenDefined('defaultVariants', styling?.defaults),
    ...whenDefined('compoundVariants', styling?.compounds),
    ...whenDefined('normalizeFn', options.normalize),
    ...whenDefined('ariaRules', enforcement?.aria),
    ...whenDefined('childRules', enforcement?.children),
    ...whenDefined('allowedAs', enforcement?.allowedAs),
    ...whenDefined('precomputedClasses', styling?.precomputedClasses),
  })
}
