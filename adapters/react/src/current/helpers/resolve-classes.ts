import type { NodeDecoration } from '@pk2/core'
import { getActiveProps } from '@pk2/core'
import type { NodeId } from '@pk2/foundation'
import type { VariantConfig } from '@pk2/style'
import { createVariantPass } from '@pk2/style'
import type { CompoundRecord, Defaults } from './build-variant-config'
import { resolveCompounds } from './resolve-compounds'

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
): ClassResolution {
  const active = getActiveProps('root', decoration)

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
