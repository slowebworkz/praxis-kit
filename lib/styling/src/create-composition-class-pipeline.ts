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

function mergeVariants(
  partner: Variants,
  primary: Variants,
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
    if (!sameKeys(partnerValues, primaryValues)) {
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
export function createCompositionClassPipeline({
  primary,
  partner,
  composeDefaults,
  onDiagnostic,
}: CompositionStyleOptions): ClassPipelineFn {
  const partnerOptions = partner ?? {}
  const variants = mergeVariants(partnerOptions.variants, primary.variants, onDiagnostic)
  const defaults = {
    ...(partnerOptions.defaultVariants ?? {}),
    ...(composeDefaults ?? {}),
    ...(primary.defaultVariants ?? {}),
  }
  const recipes = mergeRecipes(partnerOptions.recipeMap, primary.recipeMap)
  const tagMap = mergeTags(partnerOptions.tagMap, primary.tagMap)
  // exactOptionalPropertyTypes: omit absent keys rather than assigning `undefined`.
  const combined = {
    baseClassName: joinClasses(partnerOptions.baseClassName, primary.baseClassName),
    ...(variants && { variants }),
    defaultVariants: defaults,
    compoundVariants: [
      ...(partnerOptions.compoundVariants ?? []),
      ...(primary.compoundVariants ?? []),
    ],
    ...(recipes && { recipeMap: recipes }),
    ...(tagMap && { tagMap }),
    // Deliberately omit precomputedClasses: a per-contract lookup cannot safely
    // represent the combined contribution, and the option is optional.
  } satisfies ClassPipelineOptions<VariantMap>

  return createClassPipeline(combined)
}
