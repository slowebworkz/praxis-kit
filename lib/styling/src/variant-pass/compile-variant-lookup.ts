import type { DefaultMap } from '@praxis-kit/pipeline'
import { iterate } from '@praxis-kit/primitive'
import type { CompoundVariant, VariantConfig } from './variant-pass'

// 512 mirrors the vite-plugin cap — keeps artifact payloads reasonable.
const MAX_COMBINATIONS = 512

type Dimension = { key: string; values: string[] }

/**
 * Builds the lookup key for a set of explicitly-set variant props.
 * Absent dimensions are excluded; the precomputed value already bakes in defaults.
 * Both compilation and runtime lookup must call this with the same input shape.
 */
export function buildPrecomputedKey(props: DefaultMap): string {
  return Object.entries(props)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|')
}

function combinationCount(dimensions: readonly Dimension[]): number {
  return iterate.reduce(dimensions, 1, (total, { values }) => total * (values.length + 1))
}

function enumerateCombinations(dimensions: readonly Dimension[]): Array<DefaultMap> {
  let combos: DefaultMap[] = [{}]

  iterate.forEach(dimensions, ({ key, values }) => {
    const next: DefaultMap[] = []
    iterate.forEach(combos, (combo) => {
      next.push(combo) // dimension absent
      iterate.forEach(values, (value) => {
        next.push({ ...combo, [key]: value })
      })
    })
    combos = next
  })

  return combos
}

function matchesCompound(compound: CompoundVariant, effective: DefaultMap): boolean {
  let matches = true

  iterate.forEachEntry(compound, (key, value) => {
    if (key === 'class') return

    if (effective[key] !== value) {
      matches = false
    }
  })

  return matches
}

function flattenClass(cls: string | readonly string[]): string {
  return typeof cls === 'string' ? cls : cls.join(' ')
}

function resolveCombo(
  config: Pick<VariantConfig, 'variants' | 'compounds'>,
  dimensions: readonly Dimension[],
  effective: DefaultMap,
): string {
  const classes: string[] = []

  iterate.forEach(dimensions, ({ key }) => {
    const active = effective[key]
    if (active !== undefined) {
      const cls = config.variants[key]?.[active]
      if (cls !== undefined && cls !== '') classes.push(cls)
    }
  })

  iterate.forEach(config.compounds ?? [], (compound) => {
    if (matchesCompound(compound, effective)) {
      const cls = flattenClass(compound.class)
      if (cls !== '') classes.push(cls)
    }
  })

  return classes.join(' ')
}

/**
 * Compiles a variant config into a lookup table keyed by explicit prop combination.
 * Each value is the precomputed class string for that combination, factoring in
 * defaults and compound variants.
 *
 * Returns null when variants are empty or combination count exceeds MAX_COMBINATIONS —
 * the caller should fall back to the runtime pass.
 */
export function compileVariantLookup(config: VariantConfig): DefaultMap | null {
  const { variants, defaults = {}, compounds = [] } = config
  const dimensions: Dimension[] = Object.entries(variants).map(([key, valueMap]) => ({
    key,
    values: Object.keys(valueMap),
  }))

  if (dimensions.length === 0) return null
  if (combinationCount(dimensions) > MAX_COMBINATIONS) return null

  const result: DefaultMap = {}

  iterate.forEach(enumerateCombinations(dimensions), (combo) => {
    const effective: DefaultMap = { ...defaults, ...combo }
    result[buildPrecomputedKey(combo)] = resolveCombo(
      { variants, compounds },
      dimensions,
      effective,
    )
  })

  return result
}
