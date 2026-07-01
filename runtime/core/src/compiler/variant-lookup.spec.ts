import type { Pass } from '@pk2/pipeline'
import type { CompilerContext } from './types'
import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'
import { variantLookupPass } from './variant-lookup-pass'
import { completeIdentityPass, nodes } from './compile-component.helpers'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lookup(result: Awaited<ReturnType<typeof compileComponent>>): unknown {
  return result!.precomputed?.variantLookup
}

// ─── variantLookupPass ───────────────────────────────────────────────────────

describe('variantLookupPass', () => {
  it('populates artifact.precomputed.variantLookup', async () => {
    const pass = variantLookupPass(
      { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      'lookup',
    )
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    expect(lookup(result)).toBeDefined()
  })

  it('covers all explicit variant combinations including absent dimensions', async () => {
    const pass = variantLookupPass(
      { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      'lookup',
    )
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    const map = lookup(result) as Record<string, string>

    expect(map['']).toBe('') // no size, no default — empty
    expect(map['size:sm']).toBe('text-sm')
    expect(map['size:lg']).toBe('text-lg')
  })

  it('keys are sorted — multi-dimension key is order independent', async () => {
    const pass = variantLookupPass(
      {
        variants: {
          size: { sm: 'text-sm', lg: 'text-lg' },
          intent: { primary: 'bg-blue', secondary: 'bg-gray' },
        },
      },
      'lookup',
    )
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    const map = lookup(result) as Record<string, string>

    expect(map['intent:primary|size:lg']).toBe('text-lg bg-blue')
    expect(map['intent:secondary|size:sm']).toBe('text-sm bg-gray')
  })

  it('bakes defaults into absent-dimension combinations', async () => {
    const pass = variantLookupPass(
      {
        variants: {
          size: { sm: 'text-sm', lg: 'text-lg' },
          intent: { primary: 'bg-blue', secondary: 'bg-gray' },
        },
        defaults: { intent: 'primary' },
      },
      'lookup',
    )
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    const map = lookup(result) as Record<string, string>

    expect(map['size:lg']).toBe('text-lg bg-blue') // intent defaults to primary
    expect(map['']).toBe('bg-blue') // only default intent fires
    expect(map['intent:secondary|size:lg']).toBe('text-lg bg-gray') // explicit override
  })

  it('produces (v+1)^d entries — one per explicit combination including all-absent', async () => {
    const pass = variantLookupPass(
      {
        variants: {
          size: { sm: 'text-sm', lg: 'text-lg' }, // 3 states: absent, sm, lg
          intent: { primary: 'bg-blue', secondary: 'bg-gray' }, // 3 states
        },
      },
      'lookup',
    )
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    const map = lookup(result) as Record<string, string>
    expect(Object.keys(map)).toHaveLength(9) // 3 × 3
  })

  it('includes compound variant classes in the lookup value', async () => {
    const pass = variantLookupPass(
      {
        variants: {
          size: { sm: 'text-sm', lg: 'text-lg' },
          intent: { primary: 'bg-blue', secondary: 'bg-gray' },
        },
        compounds: [{ size: 'lg', intent: 'primary', class: 'ring-2' }],
      },
      'lookup',
    )
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    const map = lookup(result) as Record<string, string>

    expect(map['intent:primary|size:lg']).toBe('text-lg bg-blue ring-2')
    expect(map['intent:secondary|size:lg']).toBe('text-lg bg-gray') // compound does not fire
    expect(map['intent:primary|size:sm']).toBe('text-sm bg-blue') // compound does not fire
  })

  it('is a no-op pass when variants are empty', async () => {
    const pass = variantLookupPass({ variants: {} }, 'lookup')
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    expect(lookup(result)).toBeUndefined()
  })

  it('is a no-op pass when combinations exceed the 512-entry cap', async () => {
    // 10 dimensions × 2 values each → (2+1)^10 = 59,049 combinations
    const manyDimensions = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`d${i}`, { a: `cls-${i}-a`, b: `cls-${i}-b` }]),
    )
    const pass = variantLookupPass({ variants: manyDimensions }, 'lookup')
    const result = await compileComponent(nodes(completeIdentityPass, pass))
    expect(lookup(result)).toBeUndefined()
  })

  it('pass name flows through to the pipeline node', () => {
    const pass = variantLookupPass({ variants: { size: { sm: 'text-sm' } } }, 'style-lookup')
    expect((pass as Pass<CompilerContext>).name).toBe('style-lookup')
  })
})

// ─── buildPrecomputedKey ─────────────────────────────────────────────────────

describe('buildPrecomputedKey', async () => {
  const { buildPrecomputedKey } = await import('@pk2/style')

  it('returns empty string for empty props', () => {
    expect(buildPrecomputedKey({})).toBe('')
  })

  it('sorts keys alphabetically', () => {
    expect(buildPrecomputedKey({ size: 'lg', intent: 'primary' })).toBe('intent:primary|size:lg')
  })

  it('single dimension', () => {
    expect(buildPrecomputedKey({ size: 'sm' })).toBe('size:sm')
  })
})
