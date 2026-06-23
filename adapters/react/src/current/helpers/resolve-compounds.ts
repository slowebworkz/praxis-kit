import type { CompoundRecord } from './build-variant-config'
import { flattenClassName } from './build-variant-config'

export function resolveCompounds(
  active: Record<string, unknown>,
  compounds: ReadonlyArray<CompoundRecord> | undefined,
): string[] {
  if (compounds === undefined || compounds.length === 0) return []
  const out: string[] = []
  for (const compound of compounds) {
    const { class: cls, ...conditions } = compound
    const matches = Object.entries(conditions).every(([k, v]) => {
      const a = active[k]
      return Array.isArray(v) ? v.includes(a as string) : a === v
    })
    if (matches) out.push(flattenClassName(cls))
  }
  return out
}
