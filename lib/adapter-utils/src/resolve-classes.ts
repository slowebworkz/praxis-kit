import type { NodeDecoration } from '@pk2/core'
import { getActiveProps } from '@pk2/core'
import type { NodeId, DefaultMap } from '@pk2/pipeline'
import type { VariantConfig } from '@pk2/style'
import { buildPrecomputedKey, createVariantPass } from '@pk2/style'
import type { CompoundRecord, Defaults } from './build-variant-config'
import { resolveCompounds } from './resolve-compounds'
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

  if (variantLookup !== undefined && recipe === undefined) {
    const activeVariants: DefaultMap = {}
    iterate.forEachKey(variantConfig.variants, (key) => {
      const value = active[key]
      if (typeof value === 'string') activeVariants[key] = value
    })
    const lookupKey = buildPrecomputedKey(activeVariants)
    const precomputedValue = variantLookup[lookupKey]
    if (precomputedValue !== undefined) {
      return {
        variantClasses: precomputedValue !== '' ? [precomputedValue] : [],
        compoundClasses: [],
      }
    }
  }

  const passInput = recipe !== undefined ? { ...active, preset: recipe } : active

  const { context } = createVariantPass(passInput, variantConfig).execute({ classes: [] })
  const variantClasses = context.classes

  const presetOverrides = recipe !== undefined ? (variantConfig.presets?.[recipe] ?? {}) : {}

  const resolvedValues = {
    ...variantDefaults,
    ...presetOverrides,
    ...active,
  }
  const compoundClasses = resolveCompounds(resolvedValues, compounds)

  return { variantClasses, compoundClasses }
}
