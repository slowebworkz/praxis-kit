import type { CompoundVariant, VariantConfig } from './variant-pass'

// 512 mirrors the vite-plugin cap — keeps artifact payloads reasonable.
const MAX_COMBINATIONS = 512

type Dimension = { key: string; values: string[] }

/**
 * Builds the lookup key for a set of explicitly-set variant props.
 * Absent dimensions are excluded; the precomputed value already bakes in defaults.
 * Both compilation and runtime lookup must call this with the same input shape.
 */
export function buildPrecomputedKey(props: Record<string, string>): string {
  return Object.keys(props)
    .sort()
    .map((k) => `${k}:${props[k]}`)
    .join('|')
}

function enumerateCombinations(dimensions: Dimension[]): Array<Record<string, string>> | null {
  if (dimensions.length === 0) return [{}]

  let total = 1
  for (const { values } of dimensions) {
    total *= values.length + 1 // +1 for the "absent" case
    if (total > MAX_COMBINATIONS) return null
  }

  function rec(remaining: Dimension[]): Array<Record<string, string>> {
    if (remaining.length === 0) return [{}]
    const [first, ...rest] = remaining as [Dimension, ...Dimension[]]
    const restCombos = rec(rest)
    const out: Array<Record<string, string>> = []
    for (const combo of restCombos) {
      out.push(combo) // dimension absent
      for (const v of first.values) out.push({ [first.key]: v, ...combo })
    }
    return out
  }

  return rec(dimensions)
}

function matchesCompound(compound: CompoundVariant, effective: Record<string, string>): boolean {
  for (const [key, value] of Object.entries(compound)) {
    if (key === 'class') continue
    if (effective[key] !== value) return false
  }
  return true
}

function flattenClass(cls: string | readonly string[]): string {
  return Array.isArray(cls) ? (cls as string[]).join(' ') : (cls as string)
}

/**
 * Compiles a variant config into a lookup table keyed by explicit prop combination.
 * Each value is the precomputed class string for that combination, factoring in
 * defaults and compound variants.
 *
 * Returns null when variants are empty or combination count exceeds MAX_COMBINATIONS —
 * the caller should fall back to the runtime pass.
 */
export function compileVariantLookup(config: VariantConfig): Record<string, string> | null {
  const { variants, defaults = {}, compounds = [] } = config
  const dimensions: Dimension[] = Object.entries(variants).map(([key, valueMap]) => ({
    key,
    values: Object.keys(valueMap),
  }))

  if (dimensions.length === 0) return null

  const combos = enumerateCombinations(dimensions)
  if (!combos) return null

  const result: Record<string, string> = {}

  for (const combo of combos) {
    const key = buildPrecomputedKey(combo)
    const effective: Record<string, string> = { ...defaults, ...combo }
    const classes: string[] = []

    for (const { key: dim, values } of dimensions) {
      const active = effective[dim]
      if (active !== undefined) {
        const cls = variants[dim]?.[active]
        if (cls !== undefined && cls !== '') classes.push(cls)
      }
      void values // used only for enumeration
    }

    for (const compound of compounds) {
      if (matchesCompound(compound, effective)) {
        const cls = flattenClass(compound.class)
        if (cls !== '') classes.push(cls)
      }
    }

    result[key] = classes.join(' ')
  }

  return result
}
