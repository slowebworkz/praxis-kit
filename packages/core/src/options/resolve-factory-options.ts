import type {
  AnyClassPluginFactory,
  AnyRecord,
  AriaRule,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  IntrinsicProps,
  NormalizeFn,
  RecipeMap,
  PropNormalizer,
  ResolvedFactoryOptions,
  VariantMap,
} from '../types'
import { resolveDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

const EMPTY_VARIANT_KEYS: ReadonlySet<string> = new Set()

function composeNormalizers<Props extends AnyRecord>(
  normalizers: readonly PropNormalizer[] | undefined,
  fn: NormalizeFn<Props> | undefined,
): NormalizeFn<Props> | undefined {
  if (!normalizers?.length) return fn
  return ((props) => {
    const patched = normalizers.reduce(
      (acc, normalizer) => ({ ...acc, ...normalizer(acc) }),
      props as AnyRecord,
    ) as Props & IntrinsicProps
    return fn ? fn(patched as Readonly<Props & IntrinsicProps>) : patched
  }) as NormalizeFn<Props>
}

function whenDefined<K extends PropertyKey, V>(
  key: K,
  value: V | undefined,
): Record<K, V> | EmptyRecord {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>)
}

// `enforcement.rules` exists purely so a rule with no relationship to ARIA (an HTML fact, a
// security check) doesn't have to sit under the misleadingly-named `aria` bucket to get
// AriaPolicyEngine's fix/cache machinery — both buckets run through the same engine, so they're
// merged into one rule set here rather than kept as two separate concepts downstream.
function mergeAriaRules(
  aria: readonly AriaRule[] | undefined,
  rules: readonly AriaRule[] | undefined,
): readonly AriaRule[] | undefined {
  if (!aria?.length) return rules
  if (!rules?.length) return aria
  return [...aria, ...rules]
}

export function resolveFactoryOptions<
  TDefault extends ElementType,
  Props extends AnyRecord,
  V extends Readonly<VariantMap>,
  TPreset extends RecipeMap<V>,
>(
  options: FactoryOptions<TDefault, Props, V, TPreset, AnyClassPluginFactory> = {},
): Readonly<ResolvedFactoryOptions<TDefault, Props, V, TPreset>> {
  const { styling, enforcement } = options
  const composedNormalizeFn = composeNormalizers(enforcement?.props, options.normalize)

  const variantKeys: ReadonlySet<string> =
    styling?.variants === undefined ? EMPTY_VARIANT_KEYS : new Set(Object.keys(styling.variants))

  // whenDefined spreads satisfy exactOptionalPropertyTypes: { key: undefined } and {} are distinct.
  return Object.freeze({
    defaultTag: (options.tag ?? 'div') as TDefault,
    diagnostics: resolveDiagnostics(
      enforcement?.diagnostics,
      options.diagnostics ?? silentDiagnostics,
    ),
    variantKeys,
    ...whenDefined('displayName', options.name),
    ...whenDefined('defaultProps', options.defaults),
    ...whenDefined('baseClassName', styling?.base),
    ...whenDefined('tagMap', styling?.tags),
    ...whenDefined('recipeMap', styling?.presets),
    ...whenDefined('variants', styling?.variants),
    ...whenDefined('defaultVariants', styling?.defaults),
    ...whenDefined('compoundVariants', styling?.compounds),
    ...whenDefined('normalizeFn', composedNormalizeFn),
    ...whenDefined('ariaRules', mergeAriaRules(enforcement?.aria, enforcement?.rules)),
    ...whenDefined('childRules', enforcement?.children),
    ...whenDefined('exclusiveChildren', enforcement?.exclusiveChildren),
    ...whenDefined('allowText', enforcement?.allowText),
    ...whenDefined('allowedAs', enforcement?.allowedAs),
    ...whenDefined('precomputedClasses', styling?.precomputedClasses),
  })
}
