import type { CompoundRecord } from './build-variant-config'
import { flattenClassName } from './build-variant-config'
import { iterate } from '@praxis-kit/primitive'
import type { AnyRecord } from '@praxis-kit/primitive'

function matchesCompound(active: AnyRecord, compound: CompoundRecord): boolean {
  const { class: _, ...conditions } = compound

  return Object.entries(conditions).every(([key, expected]) => {
    const actual = active[key]
    return Array.isArray(expected) ? expected.includes(actual as string) : actual === expected
  })
}

export function resolveCompounds(
  active: AnyRecord,
  compounds: readonly CompoundRecord[] | undefined,
): string[] {
  if (!compounds?.length) return []

  const out: string[] = []

  iterate.forEach(compounds, (compound) => {
    if (matchesCompound(active, compound)) {
      out.push(flattenClassName(compound.class))
    }
  })

  return out
}
