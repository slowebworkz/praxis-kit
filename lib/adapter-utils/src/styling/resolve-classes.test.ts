import { describe, expect, it } from 'vitest'
import { resolveClasses } from './resolve-classes'
import type { NodeDecoration } from '@praxis-kit/runtime'
import type { VariantConfig } from '@praxis-kit/styling'
import type { CompoundRecord } from './build-variant-config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decoration(variants: Record<string, string> = {}): Record<string, NodeDecoration> {
  return { root: { variants } }
}

const config: VariantConfig = {
  variants: {
    size: { sm: 'text-sm', lg: 'text-lg' },
    color: { red: 'text-red-500', blue: 'text-blue-500' },
  },
}

// ─── Runtime pass ─────────────────────────────────────────────────────────────

describe('resolveClasses — runtime pass', () => {
  it('returns empty arrays when no variants are active', () => {
    const result = resolveClasses(decoration(), config, {}, undefined)
    expect(result.variantClasses).toEqual([])
    expect(result.compoundClasses).toEqual([])
  })

  it('resolves a single active variant', () => {
    const result = resolveClasses(decoration({ size: 'sm' }), config, {}, undefined)
    expect(result.variantClasses).toContain('text-sm')
    expect(result.compoundClasses).toEqual([])
  })

  it('resolves multiple active variants', () => {
    const result = resolveClasses(decoration({ size: 'lg', color: 'blue' }), config, {}, undefined)
    expect(result.variantClasses).toContain('text-lg')
    expect(result.variantClasses).toContain('text-blue-500')
  })

  it('applies variantConfig defaults for absent variants', () => {
    const configWithDefaults: VariantConfig = { ...config, defaults: { size: 'sm' } }
    const result = resolveClasses(decoration(), configWithDefaults, {}, undefined)
    expect(result.variantClasses).toContain('text-sm')
  })

  it('variantDefaults feed compound matching but not the variant pass', () => {
    const compounds: CompoundRecord[] = [{ size: 'sm', class: 'ring' }]
    const result = resolveClasses(decoration(), config, { size: 'sm' }, undefined, compounds)
    // compound fires because variantDefaults fills in 'sm'
    expect(result.compoundClasses).toContain('ring')
    // but no variant class since size wasn't in decoration
    expect(result.variantClasses).toEqual([])
  })

  it('resolves compound classes when conditions match', () => {
    const compounds: CompoundRecord[] = [{ size: 'sm', color: 'red', class: 'font-bold' }]
    const result = resolveClasses(
      decoration({ size: 'sm', color: 'red' }),
      config,
      {},
      undefined,
      compounds,
    )
    expect(result.compoundClasses).toContain('font-bold')
  })

  it('does not apply compound when conditions do not match', () => {
    const compounds: CompoundRecord[] = [{ size: 'sm', color: 'red', class: 'font-bold' }]
    const result = resolveClasses(
      decoration({ size: 'lg', color: 'red' }),
      config,
      {},
      undefined,
      compounds,
    )
    expect(result.compoundClasses).toEqual([])
  })
})

// ─── Precomputed lookup ───────────────────────────────────────────────────────

describe('resolveClasses — precomputed lookup', () => {
  const lookup = {
    'color:red|size:sm': 'text-sm text-red-500',
    'size:lg': 'text-lg',
    '': '',
  }

  it('uses the lookup table when a matching key is found', () => {
    const result = resolveClasses(
      decoration({ size: 'sm', color: 'red' }),
      config,
      {},
      undefined,
      undefined,
      lookup,
    )
    expect(result.variantClasses).toEqual(['text-sm text-red-500'])
    expect(result.compoundClasses).toEqual([])
  })

  it('falls through to runtime pass when lookup key is missing', () => {
    const result = resolveClasses(
      decoration({ size: 'sm', color: 'blue' }),
      config,
      {},
      undefined,
      undefined,
      lookup,
    )
    // 'color:blue|size:sm' is not in the lookup → runtime pass
    expect(result.variantClasses).toContain('text-sm')
    expect(result.variantClasses).toContain('text-blue-500')
  })

  it('skips the lookup when a recipe is provided', () => {
    const configWithPreset: VariantConfig = {
      ...config,
      presets: { compact: { size: 'sm' } },
    }
    const result = resolveClasses(decoration(), configWithPreset, {}, 'compact', undefined, lookup)
    // recipe bypasses lookup — runtime pass runs with preset
    expect(result.variantClasses).toContain('text-sm')
  })
})
