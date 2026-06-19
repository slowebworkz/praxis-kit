import { describe, expect, it, vi } from 'vitest'

import { cva } from './cva'
import { VariantClassResolver } from './variant-class-resolver'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sizeFn = cva('', {
  variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
  defaultVariants: { size: 'sm' },
})

const intentFn = cva('', {
  variants: {
    size: { sm: 'text-sm', lg: 'text-lg' },
    intent: { primary: 'text-blue-500', danger: 'text-red-500' },
  },
  defaultVariants: { size: 'sm', intent: 'primary' },
})

// ---------------------------------------------------------------------------
// No CVA fn
// ---------------------------------------------------------------------------

describe('VariantClassResolver — no CVA fn', () => {
  it('returns empty string when cvaFn is null', () => {
    const r = new VariantClassResolver(null)
    expect(r.resolve({ props: {}, recipe: undefined })).toBe('')
  })

  it('returns empty string with preset when cvaFn is null', () => {
    const r = new VariantClassResolver(null, { primary: { size: 'lg' } })
    expect(r.resolve({ props: {}, recipe: 'primary' })).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Variants from props
// ---------------------------------------------------------------------------

describe('VariantClassResolver — variant props', () => {
  it('applies defaultVariants when no props provided', () => {
    const r = new VariantClassResolver(sizeFn)
    expect(r.resolve({ props: {}, recipe: undefined })).toContain('text-sm')
  })

  it('applies explicit variant prop', () => {
    const r = new VariantClassResolver(sizeFn)
    expect(r.resolve({ props: { size: 'lg' }, recipe: undefined })).toContain('text-lg')
  })

  it('applies multiple variant props', () => {
    const r = new VariantClassResolver(intentFn)
    const result = r.resolve({ props: { size: 'lg', intent: 'danger' }, recipe: undefined })
    expect(result).toContain('text-lg')
    expect(result).toContain('text-red-500')
  })
})

// ---------------------------------------------------------------------------
// recipeMap
// ---------------------------------------------------------------------------

describe('VariantClassResolver — recipeMap', () => {
  it('merges preset props into variant resolution', () => {
    const r = new VariantClassResolver(sizeFn, { large: { size: 'lg' } })
    expect(r.resolve({ props: {}, recipe: 'large' })).toContain('text-lg')
  })

  it('explicit props override preset', () => {
    const r = new VariantClassResolver(sizeFn, { large: { size: 'lg' } })
    expect(r.resolve({ props: { size: 'sm' }, recipe: 'large' })).toContain('text-sm')
    expect(r.resolve({ props: { size: 'sm' }, recipe: 'large' })).not.toContain('text-lg')
  })

  it('falls back to defaultVariants when preset key is missing', () => {
    const r = new VariantClassResolver(sizeFn, {})
    expect(r.resolve({ props: {}, recipe: 'nonexistent' })).toContain('text-sm')
  })

  it('unknown recipe does not throw', () => {
    const r = new VariantClassResolver(sizeFn, { primary: { size: 'sm' } })
    expect(() => r.resolve({ props: {}, recipe: 'unknown' })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

describe('VariantClassResolver — caching', () => {
  it('returns same string on repeated identical calls', () => {
    const r = new VariantClassResolver(sizeFn)
    const first = r.resolve({ props: { size: 'lg' }, recipe: undefined })
    const second = r.resolve({ props: { size: 'lg' }, recipe: undefined })
    expect(first).toBe(second)
  })

  it('different props produce different results', () => {
    const r = new VariantClassResolver(sizeFn)
    const sm = r.resolve({ props: { size: 'sm' }, recipe: undefined })
    const lg = r.resolve({ props: { size: 'lg' }, recipe: undefined })
    expect(sm).not.toBe(lg)
  })

  it('different variantKeys produce different results', () => {
    const r = new VariantClassResolver(sizeFn, {
      small: { size: 'sm' },
      large: { size: 'lg' },
    })
    const sm = r.resolve({ props: {}, recipe: 'small' })
    const lg = r.resolve({ props: {}, recipe: 'large' })
    expect(sm).not.toBe(lg)
  })
})

// ---------------------------------------------------------------------------
// LRU eviction
// ---------------------------------------------------------------------------

describe('VariantClassResolver — LRU eviction', () => {
  it('evicts the oldest entry when the cache exceeds 1000 entries', () => {
    const fn = vi.fn((props: Record<string, unknown>) => String(props['k']))
    const r = new VariantClassResolver(fn)

    // prime k=0 (oldest), then push 1000 more unique entries to force eviction
    r.resolve({ props: { k: 0 }, recipe: undefined })
    for (let i = 1; i <= 1000; i++) {
      r.resolve({ props: { k: i }, recipe: undefined })
    }

    // k=0 should be evicted — resolving it must recompute
    const before = fn.mock.calls.length
    r.resolve({ props: { k: 0 }, recipe: undefined })
    expect(fn.mock.calls.length).toBe(before + 1)
  })

  it('a cache hit repositions the entry so it survives subsequent eviction', () => {
    const fn = vi.fn((props: Record<string, unknown>) => String(props['k']))
    const r = new VariantClassResolver(fn)

    // fill to exactly 1000: k=0 is oldest, k=999 is newest
    for (let i = 0; i <= 999; i++) {
      r.resolve({ props: { k: i }, recipe: undefined })
    }
    // refresh k=0 → moves to most-recently-used; k=1 becomes oldest
    r.resolve({ props: { k: 0 }, recipe: undefined })
    // add k=1000 → triggers eviction; k=1 (now oldest) is dropped
    r.resolve({ props: { k: 1000 }, recipe: undefined })

    const before = fn.mock.calls.length
    r.resolve({ props: { k: 0 }, recipe: undefined }) // still cached — no new call
    expect(fn.mock.calls.length).toBe(before)
    r.resolve({ props: { k: 1 }, recipe: undefined }) // evicted — recomputed
    expect(fn.mock.calls.length).toBe(before + 1)
  })
})
