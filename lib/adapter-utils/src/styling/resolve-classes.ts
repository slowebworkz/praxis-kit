import type { NodeDecoration, NodeId } from '@praxis-kit/runtime'
import { getActiveProps } from '@praxis-kit/runtime'
import type { DefaultMap, VariantConfig } from '@praxis-kit/styling'
import { buildPrecomputedKey, createVariantPass } from '@praxis-kit/styling'
import type { CompoundRecord, Defaults } from './build-variant-config'
import { resolveCompounds } from './resolve-compounds'
import { isDefined, isString, isUndefined } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'

export interface ClassResolution {
  variantClasses: string[]
  compoundClasses: string[]
}

export function resolveClasses(
  decoration: Record<NodeId, NodeDecoration>,
  variantConfig: VariantConfig,
  variantDefaults: Defaults,
  recipe: string | undefined,
  compounds?: ReadonlyArray<CompoundRecord>,
  variantLookup?: DefaultMap,
): ClassResolution {
  const active = getActiveProps('root', decoration)

  if (isDefined(variantLookup) && isUndefined(recipe)) {
    const activeVariants: DefaultMap = {}
    iterate.forEachKey(variantConfig.variants, (key) => {
      const value = active[key]
      if (isString(value)) activeVariants[key] = value
    })
    const lookupKey = buildPrecomputedKey(activeVariants)
    const precomputedValue = variantLookup[lookupKey]
    if (isDefined(precomputedValue)) {
      return {
        variantClasses: precomputedValue !== '' ? [precomputedValue] : [],
        compoundClasses: [],
      }
    }
  }

  const passInput = isDefined(recipe) ? { ...active, preset: recipe } : active

  const { context } = createVariantPass(passInput, variantConfig).execute({ classes: [] })
  const variantClasses = context.classes

  const presetOverrides = isDefined(recipe) ? (variantConfig.presets?.[recipe] ?? {}) : {}

  const resolvedValues = {
    ...variantDefaults,
    ...presetOverrides,
    ...active,
  }
  const compoundClasses = resolveCompounds(resolvedValues, compounds)

  return { variantClasses, compoundClasses }
}
