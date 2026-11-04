import type {
  AnyRecord,
  ClassPipelineFn,
  ClassPipelineOptions,
  CompositionStyleOptions,
  CompositionTagMap as TagMap,
  CompositionVariants as Variants,
  VariantMap,
} from './types'
import { createClassPipeline } from './create-class-pipeline'
import { isString } from '@praxis-kit/guards'

function classString(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(' ')
  return isString(value) ? value : ''
}

function joinClasses(...values: unknown[]): string {
  return values.map(classString).filter(Boolean).join(' ')
}

function mergeTags(partner: TagMap, primary: TagMap): TagMap {
  if (!partner && !primary) return undefined
  const result: NonNullable<TagMap> = {}
  for (const key of new Set([...Object.keys(partner ?? {}), ...Object.keys(primary ?? {})])) {
    result[key] = joinClasses(partner?.[key], primary?.[key])
  }
  return result
}

function sameKeys(left: Readonly<AnyRecord>, right: Readonly<AnyRecord>): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.hasOwn(right, key))
}

function incompatibleVariantNames(partner: Variants, primary: Variants): Set<string> {
  const incompatible = new Set<string>()
  for (const name of Object.keys(partner ?? {})) {
    const partnerValues = partner?.[name]
    const primaryValues = primary?.[name]
    if (partnerValues && primaryValues && !sameKeys(partnerValues, primaryValues)) {
      incompatible.add(name)
    }
  }
  return incompatible
}

function filterIncompatibleSelections<T extends AnyRecord>(
  selections: T | undefined,
  incompatible: ReadonlySet<string>,
  primaryVariants: Variants,
): T | undefined {
  if (!selections || incompatible.size === 0) return selections
  const result: AnyRecord = { ...selections }
  for (const name of incompatible) {
    if (
      Object.hasOwn(result, name) &&
      !Object.hasOwn(primaryVariants?.[name] ?? {}, String(result[name]))
    ) {
      delete result[name]
    }
  }
  return result as T
}

/**
 * Partner compounds stay owned by the partner and are evaluated against the combined selection,
 * but a condition on an incompatible variant may only name values the primary definition supports
 * (the primary wins, so any other value cannot be selected through the primary's variant):
 *
 * - a scalar condition with a supported value is kept; an unsupported one drops the compound;
 * - an array condition is narrowed to its supported values, and drops the compound when none remain;
 * - conditions on other variants are left untouched.
 *
 * Primary compounds are never filtered. Every key except `class` is a condition.
 */
function narrowIncompatibleCompounds(
  compounds: ClassPipelineOptions<VariantMap>['compoundVariants'],
  incompatible: ReadonlySet<string>,
  primaryVariants: Variants,
): NonNullable<ClassPipelineOptions<VariantMap>['compoundVariants']> {
  if (!compounds) return []
  if (incompatible.size === 0) return compounds

  const result: Array<(typeof compounds)[number]> = []
  for (const compound of compounds) {
    const narrowed: AnyRecord = { ...compound }
    let keep = true
    for (const name of incompatible) {
      if (!Object.hasOwn(narrowed, name)) continue
      const supported = (value: unknown): boolean =>
        Object.hasOwn(primaryVariants?.[name] ?? {}, String(value))
      const condition = narrowed[name]
      if (Array.isArray(condition)) {
        const values = condition.filter(supported)
        if (values.length === 0) keep = false
        else narrowed[name] = values
      } else if (!supported(condition)) {
        keep = false
      }
      if (!keep) break
    }
    if (keep) result.push(narrowed as (typeof compounds)[number])
  }
  return result
}

function mergeVariants(
  partner: Variants,
  primary: Variants,
  incompatible: ReadonlySet<string>,
  onDiagnostic?: (message: string) => void,
): Variants {
  if (!partner && !primary) return undefined
  const result: NonNullable<Variants> = {}
  const names = new Set([...Object.keys(partner ?? {}), ...Object.keys(primary ?? {})])

  for (const name of names) {
    const partnerValues = partner?.[name]
    const primaryValues = primary?.[name]
    if (!partnerValues) {
      result[name] = Object.fromEntries(
        Object.entries(primaryValues ?? {}).map(([key, value]) => [key, classString(value)]),
      )
      continue
    }
    if (!primaryValues) {
      result[name] = Object.fromEntries(
        Object.entries(partnerValues).map(([key, value]) => [key, classString(value)]),
      )
      continue
    }
    if (incompatible.has(name)) {
      onDiagnostic?.(
        `Incompatible composed variant "${name}": the primary contract wins; the composed partner's contribution is omitted.`,
      )
      result[name] = Object.fromEntries(
        Object.entries(primaryValues).map(([key, value]) => [key, classString(value)]),
      )
      continue
    }
    result[name] = Object.fromEntries(
      Object.keys(partnerValues).map((key) => [
        key,
        joinClasses(partnerValues[key], primaryValues[key]),
      ]),
    )
  }
  return result
}

function mergeRecipes(
  partner: ClassPipelineOptions<VariantMap>['recipeMap'],
  primary: ClassPipelineOptions<VariantMap>['recipeMap'],
): ClassPipelineOptions<VariantMap>['recipeMap'] {
  if (!partner && !primary) return undefined
  const result: NonNullable<ClassPipelineOptions<VariantMap>['recipeMap']> = {}
  for (const name of new Set([...Object.keys(partner ?? {}), ...Object.keys(primary ?? {})])) {
    result[name] = { ...(partner?.[name] ?? {}), ...(primary?.[name] ?? {}) }
  }
  return result
}

/**
 * Build a framework-independent class pipeline for a primary contract and its direct partner.
 * Partner contributions are the base layer; primary contributions win incompatible definitions.
 * Recipe values are applied by the existing resolver below explicit props and above defaults.
 */
export function mergeCompositionClassPipelineOptions({
  primary,
  partner,
  composeDefaults,
  onDiagnostic,
}: CompositionStyleOptions): ClassPipelineOptions<VariantMap> {
  const partnerOptions = partner ?? {}
  const incompatible = incompatibleVariantNames(partnerOptions.variants, primary.variants)
  const variants = mergeVariants(
    partnerOptions.variants,
    primary.variants,
    incompatible,
    onDiagnostic,
  )
  const defaults = {
    ...(filterIncompatibleSelections(
      partnerOptions.defaultVariants,
      incompatible,
      primary.variants,
    ) ?? {}),
    ...(filterIncompatibleSelections(composeDefaults, incompatible, primary.variants) ?? {}),
    ...(primary.defaultVariants ?? {}),
  }
  const safePartnerRecipes = partnerOptions.recipeMap
    ? Object.fromEntries(
        Object.entries(partnerOptions.recipeMap).map(([name, selections]) => [
          name,
          filterIncompatibleSelections(selections, incompatible, primary.variants) ?? {},
        ]),
      )
    : undefined
  const recipes = mergeRecipes(safePartnerRecipes, primary.recipeMap)
  const tagMap = mergeTags(partnerOptions.tagMap, primary.tagMap)
  // exactOptionalPropertyTypes: omit absent keys rather than assigning `undefined`.
  const combined = {
    baseClassName: joinClasses(partnerOptions.baseClassName, primary.baseClassName),
    ...(variants && { variants }),
    defaultVariants: defaults,
    compoundVariants: [
      ...narrowIncompatibleCompounds(
        partnerOptions.compoundVariants,
        incompatible,
        primary.variants,
      ),
      ...(primary.compoundVariants ?? []),
    ],
    ...(recipes && { recipeMap: recipes }),
    ...(tagMap && { tagMap }),
    // Deliberately omit precomputedClasses: a per-contract lookup cannot safely
    // represent the combined contribution, and the option is optional.
  } satisfies ClassPipelineOptions<VariantMap>

  return combined
}

/**
 * Build the default framework-independent class pipeline for a primary contract and its direct
 * partner. Callers that need a selected class plugin can use the merged options independently and
 * construct their pipeline through the shared plugin-validation boundary.
 */
export function createCompositionClassPipeline(options: CompositionStyleOptions): ClassPipelineFn {
  return createClassPipeline(mergeCompositionClassPipelineOptions(options))
}
