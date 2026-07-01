import { describe, expect, it } from 'vitest'
import { buildPrecomputedKey, compileVariantLookup } from './compile-variant-lookup'
import type { VariantConfig } from './variant-pass'

// ─── buildPrecomputedKey ──────────────────────────────────────────────────────

describe('buildPrecomputedKey', () => {
  it('returns empty string for empty props', () => {
    expect(buildPrecomputedKey({})).toBe('')
  })

  it('encodes a single prop', () => {
    expect(buildPrecomputedKey({ size: 'sm' })).toBe('size:sm')
  })

  it('sorts keys alphabetically', () => {
    expect(buildPrecomputedKey({ size: 'sm', color: 'red' })).toBe('color:red|size:sm')
  })

  it('produces consistent output regardless of insertion order', () => {
    const a = buildPrecomputedKey({ z: '1', a: '2' })
    const b = buildPrecomputedKey({ a: '2', z: '1' })
    expect(a).toBe(b)
  })
})

// ─── compileVariantLookup ─────────────────────────────────────────────────────

describe('compileVariantLookup', () => {
  it('returns null for empty variants', () => {
    const config: VariantConfig = { variants: {} }
    expect(compileVariantLookup(config)).toBeNull()
  })

  it('builds a lookup for a single dimension', () => {
    const config: VariantConfig = {
      variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    }
    const table = compileVariantLookup(config)
    expect(table).not.toBeNull()
    // absent, sm, lg — 3 combos
    expect(Object.keys(table!)).toHaveLength(3)
    expect(table!['size:sm']).toBe('text-sm')
    expect(table!['size:lg']).toBe('text-lg')
    expect(table!['']!).toBe('') // both absent → no classes
  })

  it('builds a lookup for two dimensions', () => {
    const config: VariantConfig = {
      variants: {
        size: { sm: 'text-sm', lg: 'text-lg' },
        color: { red: 'text-red-500', blue: 'text-blue-500' },
      },
    }
    const table = compileVariantLookup(config)
    expect(table).not.toBeNull()
    // (2+1) * (2+1) = 9 combos
    expect(Object.keys(table!)).toHaveLength(9)
    // key is sorted: color before size
    expect(table!['color:red|size:sm']).toBe('text-sm text-red-500')
    expect(table!['color:blue']).toBe('text-blue-500')
  })

  it('bakes defaults into absent-dimension combos', () => {
    const config: VariantConfig = {
      variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
      defaults: { size: 'sm' },
    }
    const table = compileVariantLookup(config)
    expect(table).not.toBeNull()
    // when size is absent the default 'sm' fills in
    expect(table!['']!).toBe('text-sm')
    // explicit override still works
    expect(table!['size:lg']).toBe('text-lg')
  })

  it('applies compound variants when conditions match', () => {
    const config: VariantConfig = {
      variants: {
        size: { sm: 'text-sm', lg: 'text-lg' },
        color: { red: 'text-red-500', blue: 'text-blue-500' },
      },
      compounds: [{ size: 'sm', color: 'red', class: 'font-bold' }],
    }
    const table = compileVariantLookup(config)
    expect(table).not.toBeNull()
    expect(table!['color:red|size:sm']).toBe('text-sm text-red-500 font-bold')
    // non-matching combo is unaffected
    expect(table!['color:blue|size:sm']).toBe('text-sm text-blue-500')
  })

  it('returns null when combination count exceeds MAX_COMBINATIONS (512)', () => {
    // 10 dimensions × 1 value each → (1+1)^10 = 1024 combos > 512
    const variants: Record<string, Record<string, string>> = {}
    for (let i = 0; i < 10; i++) {
      variants[`dim${i}`] = { on: `cls-${i}` }
    }
    const config: VariantConfig = { variants }
    expect(compileVariantLookup(config)).toBeNull()
  })
})
